import { describe, it, expect } from 'vitest';
import { reduceBattle } from '../reduceBattle';
import { EngineBattleState, EngineDeps } from '../types';
import { createRng, d100, d6 } from '../../rng/rng';
import { createMinimalBattle, createTestCharacter, createTestEnemy } from '../../../../tests/fixtures/battleFixtures';
import { calculateStateHash } from '../../net/stateHash';

describe('reduceBattle: MOVE_PARTICIPANT', () => {
    // Minimal deps
    const deps: EngineDeps = { rng: { d6, d100 } };

    it('Moves participant position', () => {
        const battle = createMinimalBattle({
            participants: [createTestCharacter({ id: 'c1', position: { x: 0, y: 0 } })]
        });
        const state: EngineBattleState = { schemaVersion: 1, battle, rng: createRng(123) };

        const action = { type: 'MOVE_PARTICIPANT' as const, participantId: 'c1', to: { x: 1, y: 2 } };
        
        // 4.2 Paranoid check: freeze inputs to ensure no mutation
        Object.freeze(battle.participants[0].position);
        Object.freeze(action.to);
        
        const result = reduceBattle(state, action, deps);

        // Check update
        const moved = result.next.battle.participants.find(p => p.id === 'c1');
        expect(moved?.position).toEqual({ x: 1, y: 2 });

        // Check events
        expect(result.events).toHaveLength(1);
        const evt = result.events[0];
        if (evt.type !== 'PARTICIPANT_MOVED') throw new Error('Wrong event type');
        
        expect(evt).toEqual({
            type: 'PARTICIPANT_MOVED',
            participantId: 'c1',
            from: { x: 0, y: 0 },
            to: { x: 1, y: 2 }
        });

        // 4.1 Check event payload references (defensive copy check)
        const oldParticipant = battle.participants.find(p => p.id === 'c1')!;
        expect(evt.from).toEqual(oldParticipant.position);
        expect(evt.from).not.toBe(oldParticipant.position); // reference check

        expect(evt.to).toEqual(action.to);
        expect(evt.to).not.toBe(action.to); // reference check

        // Check logs
        expect(result.log).toEqual([{ key: 'log.action.move', params: { id: 'c1' } }]);

        // RNG unchanged
        expect(result.next.rng.cursor).toBe(state.rng.cursor);

        // Hash changed
        const initialHash = calculateStateHash(state);
        expect(result.stateHash).not.toBe(initialHash);
        expect(result.stateHash).toMatch(/^[0-9a-f]{8}$/);
    });

    it('No mutation', () => {
        const battle = createMinimalBattle({
            participants: [
                createTestCharacter({ id: 'c1', position: { x: 0, y: 0 } }),
                createTestCharacter({ id: 'c2', position: { x: 5, y: 5 } })
            ]
        });
        const state: EngineBattleState = { schemaVersion: 1, battle, rng: createRng(123) };
        const action = { type: 'MOVE_PARTICIPANT' as const, participantId: 'c1', to: { x: 1, y: 1 } };

        const result = reduceBattle(state, action, deps);

        // Roots differ
        expect(result.next).not.toBe(state);
        expect(result.next.battle).not.toBe(battle);
        expect(result.next.battle.participants).not.toBe(battle.participants);

        // Unchanged participant ref stable
        const p2_old = battle.participants.find(p => p.id === 'c2');
        const p2_new = result.next.battle.participants.find(p => p.id === 'c2');
        expect(p2_new).toBe(p2_old);

        // Changed participant ref new
        const p1_old = battle.participants.find(p => p.id === 'c1');
        const p1_new = result.next.battle.participants.find(p => p.id === 'c1');
        expect(p1_new).not.toBe(p1_old);

        // Original position preserved in input
        expect(p1_old?.position).toEqual({ x: 0, y: 0 });
    });

    it('Unknown participant throws', () => {
        const battle = createMinimalBattle({ participants: [] });
        const state: EngineBattleState = { schemaVersion: 1, battle, rng: createRng(123) };
        const action = { type: 'MOVE_PARTICIPANT' as const, participantId: 'missing', to: { x: 1, y: 1 } };

        expect(() => reduceBattle(state, action, deps)).toThrow('Invariant: Participant missing not found');
    });

    it('Casualty cannot move throws', () => {
        const battle = createMinimalBattle({
            participants: [createTestCharacter({ id: 'c1', position: { x: 0, y: 0 }, status: 'casualty' })]
        });
        const state: EngineBattleState = { schemaVersion: 1, battle, rng: createRng(123) };
        const action = { type: 'MOVE_PARTICIPANT' as const, participantId: 'c1', to: { x: 1, y: 1 } };

        expect(() => reduceBattle(state, action, deps)).toThrow('Invariant: Casualty cannot move: c1');
    });

    it('Move to same position — valid, event still emitted', () => {
        const battle = createMinimalBattle({
            participants: [createTestCharacter({ id: 'c1', position: { x: 0, y: 0 } })]
        });
        const state: EngineBattleState = { schemaVersion: 1, battle, rng: createRng(123) };
        const action = { type: 'MOVE_PARTICIPANT' as const, participantId: 'c1', to: { x: 0, y: 0 } };

        const result = reduceBattle(state, action, deps);

        expect(result.next.battle.participants[0].position).toEqual({ x: 0, y: 0 });
        expect(result.events).toHaveLength(1);
        expect(result.events[0]).toEqual({
            type: 'PARTICIPANT_MOVED',
            participantId: 'c1',
            from: { x: 0, y: 0 },
            to: { x: 0, y: 0 }
        });
        expect(result.next.rng.cursor).toBe(state.rng.cursor);
    });

    it('Enemy move works', () => {
        const battle = createMinimalBattle({
            participants: [createTestEnemy({ id: 'e1', position: { x: 10, y: 10 } })]
        });
        const state: EngineBattleState = { schemaVersion: 1, battle, rng: createRng(123) };
        const action = { type: 'MOVE_PARTICIPANT' as const, participantId: 'e1', to: { x: 11, y: 11 } };

        const result = reduceBattle(state, action, deps);
        
        expect(result.next.battle.participants[0].position).toEqual({ x: 11, y: 11 });
        expect(result.events).toHaveLength(1);
    });

    it('Determinism', () => {
        const battle = createMinimalBattle({
            participants: [createTestCharacter({ id: 'c1', position: { x: 0, y: 0 } })]
        });
        const state1: EngineBattleState = { schemaVersion: 1, battle: { ...battle }, rng: createRng(123) };
        const state2: EngineBattleState = { schemaVersion: 1, battle: { ...battle }, rng: createRng(123) };
        const action = { type: 'MOVE_PARTICIPANT' as const, participantId: 'c1', to: { x: 1, y: 1 } };

        const res1 = reduceBattle(state1, action, deps);
        const res2 = reduceBattle(state2, action, deps);

        expect(res1.stateHash).toBe(res2.stateHash);
        expect(res1.next.battle.participants[0].position).toEqual(res2.next.battle.participants[0].position);
    });
});
