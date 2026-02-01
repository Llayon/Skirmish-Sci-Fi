import { describe, it, expect } from 'vitest';
import { reduceBattle } from '../reduceBattle';
import { EngineBattleState, EngineDeps } from '../types';
import { createRng, RngState, d100, d6 } from '../../rng/rng';
import { createMinimalBattle, createTestCharacter } from '../../../../tests/fixtures/battleFixtures';

// --- Helpers ---

// A mock RNG that dequeues provided values
// If exhausted, throws error
function queueRng(values: number[]) {
    let baseCursor: number | null = null;
    return (state: RngState): { value: 1|2|3|4|5|6; next: RngState } => {
        if (baseCursor === null) {
            baseCursor = state.cursor;
        }
        const idx = state.cursor - baseCursor;
        const val = values[idx];
        if (val === undefined) {
            throw new Error(`queueRng exhausted at cursor ${state.cursor}`);
        }
        return { 
            value: val as 1|2|3|4|5|6, 
            next: { ...state, cursor: state.cursor + 1 } 
        };
    };
}

describe('reduceBattle: ROLL_INITIATIVE', () => {

    it('Determinism same seed', () => {
        const battle = createMinimalBattle({
            participants: [
                createTestCharacter({ id: 'c1', position: { x: 0, y: 0 }, stats: { reactions: 3 } }),
                createTestCharacter({ id: 'c2', position: { x: 1, y: 0 }, stats: { reactions: 4 } })
            ]
        });
        
        // Ensure correct phase for ROLL_INITIATIVE
        battle.phase = 'reaction_roll';

        const state1: EngineBattleState = {
            schemaVersion: 1,
            battle: { ...battle },
            rng: createRng(123)
        };
        
        const state2: EngineBattleState = {
            schemaVersion: 1,
            battle: { ...battle },
            rng: createRng(123)
        };

        // Deps with standard RNG
        const deps: EngineDeps = {
            rng: {
                d6,
                d100
            }
        };

        const res1 = reduceBattle(state1, { type: 'ROLL_INITIATIVE' }, deps);
        const res2 = reduceBattle(state2, { type: 'ROLL_INITIATIVE' }, deps);

        expect(res1.stateHash).toBe(res2.stateHash);
        expect(res1.next.rng.cursor).toBe(res2.next.rng.cursor);
        expect(res1.events).toEqual(res2.events);
        expect(res1.next.battle.reactionRolls).toEqual(res2.next.battle.reactionRolls);
    });

    it('Cursor increments by N characters', () => {
        const battle = createMinimalBattle({
            participants: [
                createTestCharacter({ id: 'c1', position: { x: 0, y: 0 } }),
                createTestCharacter({ id: 'c2', position: { x: 1, y: 0 } })
            ]
        });
        
        // Ensure correct phase for ROLL_INITIATIVE
        battle.phase = 'reaction_roll';

        const startRng = createRng(100);
        const state: EngineBattleState = { schemaVersion: 1, battle, rng: startRng };
        
        // Mock deps that just return 1
        const deps: EngineDeps = {
            rng: {
                d6: (s) => ({ value: 1, next: { ...s, cursor: s.cursor + 1 } }),
                d100
            }
        };

        const result = reduceBattle(state, { type: 'ROLL_INITIATIVE' }, deps);
        
        expect(result.next.rng.cursor).toBe(startRng.cursor + 2);
    });

    it('caught_off_guard: success is false, log present, RNG consumed', () => {
        const battle = createMinimalBattle({
            participants: [
                createTestCharacter({ id: 'c1', position: { x: 0, y: 0 }, stats: { reactions: 6 } }) // Should succeed normally
            ]
        });
        
        // Add caught_off_guard condition
        battle.deploymentCondition = { 
            id: 'caught_off_guard', 
            nameKey: 'test', 
            descriptionKey: 'test' 
        };
        battle.round = 1;
        battle.phase = 'reaction_roll';

        const state: EngineBattleState = { schemaVersion: 1, battle, rng: createRng(1) };
        
        // Mock roll 1 (would be success for reactions 6)
        // Adjust for cursor: since queueRng uses state.cursor as index, 
        // we need to make sure values are at correct index. 
        // createRng(1) starts at cursor 0. 
        const d6Values = [1];
         
        const deps: EngineDeps = {
            rng: {
                d6: queueRng(d6Values),
                d100
            }
        };

        const result = reduceBattle(state, { type: 'ROLL_INITIATIVE' }, deps);

        const roll = result.next.battle.reactionRolls['c1'];
        expect(roll.success).toBe(false);
        expect(result.log.some(l => l.key === 'log.deployment.caughtOffGuard')).toBe(true);
        expect(result.next.rng.cursor).toBe(state.rng.cursor + 1); // Consumed
    });

    it('feral fumble: unique 1 triggers log, success remains true', () => {
        const battle = createMinimalBattle({
            participants: [
                createTestCharacter({ id: 'c1', position: { x: 0, y: 0 }, stats: { reactions: 2 }, specialAbilities: ['feral_reaction_fumble'] }),
                createTestCharacter({ id: 'c2', position: { x: 1, y: 0 }, stats: { reactions: 2 } })
            ]
        });
        
        // Ensure correct phase for ROLL_INITIATIVE
        battle.phase = 'reaction_roll';

        const state: EngineBattleState = { schemaVersion: 1, battle, rng: createRng(1) };
        
        // c1 rolls 1 (success since reactions >= 1), c2 rolls 2
        const d6Values = [1, 2];
        const deps: EngineDeps = {
            rng: {
                d6: queueRng(d6Values),
                d100
            }
        };

        const result = reduceBattle(state, { type: 'ROLL_INITIATIVE' }, deps);

        const c1Roll = result.next.battle.reactionRolls['c1'];
        expect(c1Roll.success).toBe(true); // Success not changed
        expect(result.log.some(l => l.key === 'log.trait.feralFumble')).toBe(true);
    });

    it('Empty battle (no characters): cursor unchanged, orders empty', () => {
        const battle = createMinimalBattle({ participants: [] });
        // Ensure correct phase for ROLL_INITIATIVE
        battle.phase = 'reaction_roll';
        const state: EngineBattleState = { schemaVersion: 1, battle, rng: createRng(1) };
        const deps: EngineDeps = {
            rng: { d6: (s) => ({ value: 1, next: { ...s, cursor: s.cursor + 1 } }), d100 }
        };

        const result = reduceBattle(state, { type: 'ROLL_INITIATIVE' }, deps);
        
        expect(result.next.rng.cursor).toBe(state.rng.cursor);
        expect(result.next.battle.quickActionOrder).toEqual([]);
        expect(result.next.battle.slowActionOrder).toEqual([]);
        expect(result.next.battle.reactionRolls).toEqual({});
    });

    it('Multiple actions: cursor accumulates', () => {
        const battle = createMinimalBattle({
            participants: [createTestCharacter({ id: 'c1', position: { x: 0, y: 0 } })]
        });
        
        // Ensure correct phase for ROLL_INITIATIVE
        battle.phase = 'reaction_roll';

        // Use standard rng logic for this test to avoid manual cursor management
        const state0: EngineBattleState = { schemaVersion: 1, battle, rng: createRng(10) };
        const deps: EngineDeps = {
            rng: { d6: (s) => ({ value: 1, next: { ...s, cursor: s.cursor + 1 } }), d100 }
        };

        const res1 = reduceBattle(state0, { type: 'ROLL_INITIATIVE' }, deps);
        // Reset phase for second roll
        res1.next.battle.phase = 'reaction_roll';
        const res2 = reduceBattle(res1.next, { type: 'ROLL_INITIATIVE' }, deps);

        expect(res2.next.rng.cursor).toBe(state0.rng.cursor + 2);
    });

    it('No mutation', () => {
        const battle = createMinimalBattle({
            participants: [createTestCharacter({ id: 'c1', position: { x: 0, y: 0 } })]
        });
        // Ensure correct phase for ROLL_INITIATIVE
        battle.phase = 'reaction_roll';
        
        // Freeze deep? Or just check references.
        const state: EngineBattleState = { schemaVersion: 1, battle, rng: createRng(1) };
        const deps: EngineDeps = {
            rng: { d6: (s) => ({ value: 1, next: { ...s, cursor: s.cursor + 1 } }), d100 }
        };

        const result = reduceBattle(state, { type: 'ROLL_INITIATIVE' }, deps);

        expect(result.next.battle).not.toBe(battle);
        expect(result.next.battle.reactionRolls).not.toBe(battle.reactionRolls);
        expect(result.next).not.toBe(state);
        expect(battle.reactionRolls).toEqual({});
        expect(Object.keys(battle.reactionRolls).length).toBe(0);
    });
});
