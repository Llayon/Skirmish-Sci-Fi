import { describe, it, expect } from 'vitest';
import { createMinimalBattle, createTestCharacter } from '../../../../tests/fixtures/battleFixtures';
import { rollInitiative } from './rollInitiative';
import { createScriptedRngState, d6, d100 } from '../../rng/rng';
import { CURRENT_ENGINE_SCHEMA_VERSION } from '../types';

describe('rollInitiative', () => {
    it('should set phase to quick_actions when there are quick participants', () => {
        const char1 = createTestCharacter({ id: 'c1', name: 'Quick', stats: { reactions: 1 }, position: { x: 0, y: 0 } });
        const char2 = createTestCharacter({ id: 'c2', name: 'Slow', stats: { reactions: 1 }, position: { x: 0, y: 1 } });
        
        const battle = createMinimalBattle({ participants: [char1, char2] });
        battle.phase = 'reaction_roll';
        battle.round = 1;

        // Script: c1 rolls 1 (Success), c2 rolls 2 (Fail)
        // Note: Script items must match the calls. 
        // rollInitiative calls d6 for each character.
        const script = [
            { die: 'd6' as const, value: 1 },
            { die: 'd6' as const, value: 2 }
        ];

        const state = {
            schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
            battle,
            rng: createScriptedRngState(script)
        };

        const deps = { rng: { d6, d100 } };

        const result = rollInitiative(state, deps);
        
        // Assertions
        expect(result.next.battle.phase).toBe('quick_actions');
        expect(result.next.battle.activeParticipantId).toBe('c1');
        expect(result.next.battle.quickActionOrder).toEqual(['c1']);
        expect(result.next.battle.slowActionOrder).toEqual(['c2']);
    });

    it('should set phase to slow_actions when no quick participants', () => {
        const char1 = createTestCharacter({ id: 'c1', name: 'Slow1', stats: { reactions: 1 }, position: { x: 0, y: 0 } });
        const char2 = createTestCharacter({ id: 'c2', name: 'Slow2', stats: { reactions: 1 }, position: { x: 0, y: 1 } });
        
        const battle = createMinimalBattle({ participants: [char1, char2] });
        battle.phase = 'reaction_roll';
        
        // Both fail: 2, 2
        const script = [
            { die: 'd6' as const, value: 2 },
            { die: 'd6' as const, value: 2 }
        ];

        const state = {
            schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
            battle,
            rng: createScriptedRngState(script)
        };

        const deps = { rng: { d6, d100 } };

        const result = rollInitiative(state, deps);
        
        expect(result.next.battle.phase).toBe('slow_actions');
        expect(result.next.battle.activeParticipantId).toBe('c1');
        expect(result.next.battle.quickActionOrder).toEqual([]);
        expect(result.next.battle.slowActionOrder).toEqual(['c1', 'c2']);
    });
});
