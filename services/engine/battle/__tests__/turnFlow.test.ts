import { describe, it, expect, beforeEach } from 'vitest';
import { createRng, RngState } from '../../rng/rng';
import { reduceBattle } from '../reduceBattle';
import { EngineBattleState, CURRENT_ENGINE_SCHEMA_VERSION, BattleAction, EngineDeps } from '../types';
import type { Battle } from '@/types/battle';
import { cascadePhase } from '../helpers/turnFlow';

// Helper for typed deps
const fixedDeps = (d6Value: 1 | 2 | 3 | 4 | 5 | 6, d100Value = 50): EngineDeps => ({
    rng: {
        d6: (s: RngState) => ({ value: d6Value, next: { ...s, cursor: s.cursor + 1 } }),
        d100: (s: RngState) => ({ value: d100Value, next: { ...s, cursor: s.cursor + 1 } }),
    },
});

describe('Engine V2 Turn Flow', () => {
    let battle: Battle;
    let state: EngineBattleState;

    beforeEach(() => {
        battle = {
            id: 'test-battle',
            round: 1,
            phase: 'reaction_roll',
            participants: [
                { id: 'c1', type: 'character', name: 'Char1', status: 'active', stats: { reactions: 3 } },
                { id: 'c2', type: 'character', name: 'Char2', status: 'active', stats: { reactions: 1 } },
                { id: 'e1', type: 'enemy', name: 'Enemy1', status: 'active', stats: { reactions: 0 } },
                { id: 'e2', type: 'enemy', name: 'Enemy2', status: 'active', stats: { reactions: 0 } }
            ],
            quickActionOrder: [],
            slowActionOrder: [],
            enemyTurnOrder: [], 
            activeParticipantId: null,
            currentTurnIndex: -1,
            reactionRolls: {},
            reactionRerollsUsed: false,
            gridSize: { width: 10, height: 10 },
            terrain: [],
            mission: { type: 'Patrol', status: 'in_progress', titleKey: '', descriptionKey: '' },
            log: [],
            difficulty: 'normal',
            heldTheField: false,
            enemiesLostThisRound: 0,
        } as unknown as Battle;

        state = {
            schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
            battle,
            rng: createRng(123)
        };
    });

    describe('ROLL_INITIATIVE & Cascade', () => {
        it('throws if ROLL_INITIATIVE called outside reaction_roll', () => {
            state.battle.phase = 'quick_actions';
            expect(() => {
                reduceBattle(state, { type: 'ROLL_INITIATIVE' }, fixedDeps(1));
            }).toThrow('Invariant');
        });

        it('sets phase to quick_actions and selects first active participant', () => {
            // Adjust stats to ensure at least one Quick
            state.battle.participants[0].stats.reactions = 6; // Auto-pass
            
            const action: BattleAction = { type: 'ROLL_INITIATIVE' };
            const result = reduceBattle(state, action, fixedDeps(1));
            // Mock RNG forces 1.
            // c1 (6) rolls 1 -> pass -> Quick
            // c2 (1) rolls 1 -> pass -> Quick
            
            const nextBattle = result.next.battle;
            
            expect(nextBattle.phase).toBe('quick_actions');
            expect(nextBattle.quickActionOrder).toEqual(['c1', 'c2']);
            expect(nextBattle.activeParticipantId).toBe('c1');
            expect(nextBattle.currentTurnIndex).toBe(0);
            
            expect(result.events).toContainEqual(expect.objectContaining({ type: 'PHASE_CHANGED', from: 'reaction_roll', to: 'quick_actions' }));
            expect(result.events).toContainEqual(expect.objectContaining({ type: 'ACTIVE_PARTICIPANT_SET', participantId: 'c1' }));
        });

        it('cascades to enemy_actions if no quick actions', () => {
            state.battle.participants[0].stats.reactions = 0;
            state.battle.participants[1].stats.reactions = 0;
            state.battle.enemyTurnOrder = ['e1', 'e2'];

            const result = reduceBattle(state, { type: 'ROLL_INITIATIVE' }, fixedDeps(6));
            // Rolls 6 -> Fail
            
            const nextBattle = result.next.battle;
            expect(nextBattle.quickActionOrder).toEqual([]);
            expect(nextBattle.slowActionOrder).toEqual(['c1', 'c2']);
            
            expect(nextBattle.phase).toBe('enemy_actions');
            expect(nextBattle.activeParticipantId).toBe('e1');
            
            const phaseChanges = result.events.filter(e => e.type === 'PHASE_CHANGED');
            // Updated behavior: rollInitiative calculates initial phase directly, 
            // avoiding intermediate quick_actions state.
            expect(phaseChanges).toHaveLength(1); // Reaction->Enemy directly
            expect(phaseChanges[0]).toEqual(expect.objectContaining({ from: 'reaction_roll', to: 'enemy_actions' }));
        });
    });

    describe('END_TURN', () => {
        beforeEach(() => {
            state.battle.phase = 'quick_actions';
            state.battle.quickActionOrder = ['c1', 'c2'];
            state.battle.activeParticipantId = 'c1';
            state.battle.currentTurnIndex = 0;
        });

        it('advances to next participant in same phase without consuming RNG', () => {
            const cursorBefore = state.rng.cursor;
            const action: BattleAction = { type: 'END_TURN', participantId: 'c1' };
            const result = reduceBattle(state, action, fixedDeps(1));
            
            const nextBattle = result.next.battle;
            expect(nextBattle.activeParticipantId).toBe('c2');
            expect(nextBattle.currentTurnIndex).toBe(1);
            expect(nextBattle.phase).toBe('quick_actions');
            
            // Verify RNG not consumed
            expect(result.next.rng.cursor).toBe(cursorBefore);
            
            expect(result.events).toContainEqual(expect.objectContaining({ type: 'ACTIVE_PARTICIPANT_SET', participantId: 'c2' }));
            expect(result.events).toContainEqual(expect.objectContaining({ type: 'TURN_INDEX_SET', index: 1 }));
        });

        it('throws if END_TURN called for wrong participant', () => {
            expect(() => {
                reduceBattle(state, { type: 'END_TURN', participantId: 'c2' }, fixedDeps(1));
            }).toThrow('Invariant');
        });

        it('cascades to next phase when list exhausted', () => {
            state.battle.activeParticipantId = 'c2';
            state.battle.currentTurnIndex = 1;
            state.battle.enemyTurnOrder = ['e1'];

            const result = reduceBattle(state, { type: 'END_TURN', participantId: 'c2' }, fixedDeps(1));
            
            const nextBattle = result.next.battle;
            expect(nextBattle.phase).toBe('enemy_actions');
            expect(nextBattle.activeParticipantId).toBe('e1');
            
            expect(result.events).toContainEqual(expect.objectContaining({ type: 'PHASE_CHANGED', from: 'quick_actions', to: 'enemy_actions' }));
        });
    });

    describe('ADVANCE_PHASE', () => {
        it('manually advances phase without consuming RNG', () => {
            state.battle.phase = 'quick_actions';
            state.battle.quickActionOrder = ['c1']; 
            state.battle.activeParticipantId = 'c1'; 
            state.battle.enemyTurnOrder = ['e1'];
            
            const cursorBefore = state.rng.cursor;
            const result = reduceBattle(state, { type: 'ADVANCE_PHASE' }, fixedDeps(1));
            
            const nextBattle = result.next.battle;
            expect(nextBattle.phase).toBe('enemy_actions');
            expect(nextBattle.activeParticipantId).toBe('e1');
            
            // Verify RNG not consumed
            expect(result.next.rng.cursor).toBe(cursorBefore);
        });

        it('throws if called in reaction_roll', () => {
            state.battle.phase = 'reaction_roll';
            expect(() => {
                reduceBattle(state, { type: 'ADVANCE_PHASE' }, fixedDeps(1));
            }).toThrow('Invariant');
        });

        it('throws if called in battle_over', () => {
            state.battle.phase = 'battle_over';
            expect(() => {
                reduceBattle(state, { type: 'ADVANCE_PHASE' }, fixedDeps(1));
            }).toThrow('Invariant');
        });
    });

    describe('Cascade Hardening', () => {
        it('cascadePhase is idempotent (no rewind if active already set)', () => {
            state.battle.phase = 'quick_actions';
            state.battle.quickActionOrder = ['c1', 'c2'];
            state.battle.activeParticipantId = 'c2'; // Already set to 2nd
            state.battle.currentTurnIndex = 1;

            const result = cascadePhase(state);
            
            // Should be no-op
            expect(result.next.battle.activeParticipantId).toBe('c2');
            expect(result.events).toHaveLength(0);
        });

        it('cascadePhase recovers from invalid active (e.g. casualty set as active)', () => {
            state.battle.phase = 'quick_actions';
            state.battle.quickActionOrder = ['c1', 'c2'];
            state.battle.activeParticipantId = 'c1'; 
            state.battle.currentTurnIndex = 0;
            
            // Corrupt state: c1 is active BUT is casualty
            const c1 = state.battle.participants.find(p => p.id === 'c1');
            if (c1) c1.status = 'casualty';

            const result = cascadePhase(state);
            
            // Should detect invalid c1, reset, and pick c2
            expect(result.next.battle.activeParticipantId).toBe('c2');
            expect(result.next.battle.currentTurnIndex).toBe(1);
            expect(result.events).toContainEqual(expect.objectContaining({ type: 'ACTIVE_PARTICIPANT_SET', participantId: 'c2' }));
        });

        it('cascadePhase searches from currentTurnIndex + 1 if active is null', () => {
            state.battle.phase = 'quick_actions';
            state.battle.quickActionOrder = ['c1', 'c2'];
            state.battle.activeParticipantId = null;
            state.battle.currentTurnIndex = 0; // c1 just finished?

            const result = cascadePhase(state);
            
            // Should pick c2 (index 1), not c1 (index 0)
            expect(result.next.battle.activeParticipantId).toBe('c2');
            expect(result.next.battle.currentTurnIndex).toBe(1);
        });
    });

    describe('End Round & Determinism', () => {
        it('cascadePhase signature check (smoke)', () => {
            // This test ensures cascadePhase can be called with just state (no deps)
            // serving as a compile-time and runtime check for signature consistency.
            state.battle.phase = 'quick_actions';
            state.battle.quickActionOrder = ['c1'];
            state.battle.activeParticipantId = null;
            state.battle.currentTurnIndex = -1;

            const result = cascadePhase(state);
            expect(result).toBeDefined();
            expect(result.next.battle.activeParticipantId).toBe('c1');
        });

        it('full round cycle increments round and resets to reaction_roll', () => {
            state.battle.phase = 'slow_actions';
            state.battle.slowActionOrder = ['c1'];
            state.battle.activeParticipantId = 'c1';
            state.battle.currentTurnIndex = 0;
            state.battle.round = 1;

            const result = reduceBattle(state, { type: 'END_TURN', participantId: 'c1' }, fixedDeps(1));
            
            const nextBattle = result.next.battle;
            expect(nextBattle.phase).toBe('reaction_roll');
            expect(nextBattle.round).toBe(2);
            expect(nextBattle.activeParticipantId).toBeNull();
            expect(nextBattle.reactionRolls).toEqual({});
            
            expect(nextBattle.enemyTurnOrder).toContain('e1');
            expect(nextBattle.enemyTurnOrder).toContain('e2');
        });

        it('determinism: same input -> same hash', () => {
            state.battle.phase = 'quick_actions';
            state.battle.quickActionOrder = ['c1', 'c2'];
            state.battle.activeParticipantId = 'c1';
            state.battle.currentTurnIndex = 0;

            const action: BattleAction = { type: 'END_TURN', participantId: 'c1' };
            const deps = fixedDeps(1);

            const r1 = reduceBattle(state, action, deps);
            const r2 = reduceBattle(state, action, deps);

            expect(r1.stateHash).toBe(r2.stateHash);
            expect(r1.next.battle.activeParticipantId).toBe('c2');
        });
    });
});
