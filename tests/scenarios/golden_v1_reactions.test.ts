import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestCharacter, createMinimalBattle } from '../fixtures/battleFixtures';
import { coreResolverMiddleware } from '@/services/application/middleware/coreResolverMiddleware';
import { mockRng } from '../helpers/mockRng';
import { createBattleSignature } from '../helpers/battleSignature';
import { Battle, PlayerAction, LogEntry } from '@/types';

vi.mock('@/services/utils/rolls', () => ({
  rollD6: vi.fn(),
  rollD100: vi.fn(),
}));

import { rollD6 } from '@/services/utils/rolls';

// Helper to run middleware directly
const runMiddleware = (battle: Battle, action: PlayerAction) => {
    const logEntries: LogEntry[] = [];
    const context = {
        battle,
        action,
        multiplayerRole: null,
        logEntries,
        dispatch: vi.fn(),
        getState: () => ({ battle }) as any,
        success: true
    };
    const next = vi.fn();
    
    coreResolverMiddleware(context, next);
    
    return { logEntries, next };
};

describe('Golden V1 Reaction System', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    mockRng.reset();
  });

  describe('Reaction Rolls', () => {
    it('Scenario 1: Basic Reaction Roll (Success vs Failure)', () => {
        // Char 1: Reactions 1 (Default) -> Rolls 1 (Success)
        // Char 2: Reactions 1 (Default) -> Rolls 2 (Fail)
        const char1 = createTestCharacter({ id: 'c1', name: 'Quick', position: { x: 0, y: 0 }, stats: { reactions: 1 } });
        const char2 = createTestCharacter({ id: 'c2', name: 'Slow', position: { x: 0, y: 1 }, stats: { reactions: 1 } });
        
        const battle = createMinimalBattle({ participants: [char1, char2] });
        
        // Mock Rolls:
        // Char 1: 1 (Success <= 1)
        // Char 2: 2 (Fail > 1)
        mockRng.queueD6(1, 2);
        vi.mocked(rollD6).mockImplementation(() => mockRng.d6());

        const action: PlayerAction = { type: 'roll_initiative', payload: {} };
        const { logEntries } = runMiddleware(battle, action);

        const logKeys = logEntries.map(l => (typeof l === 'string' ? l : l.key));
        expect(logKeys).toMatchSnapshot();
        expect(createBattleSignature(battle)).toMatchSnapshot();

        // Verify Lists
        expect(battle.quickActionOrder).toContain('c1');
        expect(battle.quickActionOrder).not.toContain('c2');
        
        expect(battle.slowActionOrder).toContain('c2');
        expect(battle.slowActionOrder).not.toContain('c1');

        // Verify Reaction Roll State
        expect(battle.reactionRolls['c1']).toEqual({ roll: 1, success: true });
        expect(battle.reactionRolls['c2']).toEqual({ roll: 2, success: false });

        mockRng.assertEmpty();
    });

    it('Scenario 2: Caught Off Guard (Round 1) -> All Fail', () => {
        const char1 = createTestCharacter({ id: 'c1', name: 'Hero', position: { x: 0, y: 0 }, stats: { reactions: 5 } }); // High reaction
        
        const battle = createMinimalBattle({ participants: [char1] });
        battle.deploymentCondition = { 
            id: 'caught_off_guard', 
            nameKey: 'deployment.caught_off_guard.name', 
            descriptionKey: 'deployment.caught_off_guard.desc', 
        };
        battle.round = 1;

        // Roll 1 (Normally a critical success, but should fail due to Caught Off Guard)
        mockRng.queueD6(1);
        vi.mocked(rollD6).mockImplementation(() => mockRng.d6());

        const action: PlayerAction = { type: 'roll_initiative', payload: {} };
        const { logEntries } = runMiddleware(battle, action);

        const logKeys = logEntries.map(l => (typeof l === 'string' ? l : l.key));
        expect(logKeys).toMatchSnapshot();
        
        // Should contain specific log
        expect(logKeys).toContain('log.deployment.caughtOffGuard');
        
        expect(battle.quickActionOrder).toHaveLength(0);
        expect(battle.slowActionOrder).toContain('c1');
        expect(battle.reactionRolls['c1'].success).toBe(false);

        mockRng.assertEmpty();
    });

    it('Scenario 3: Feral Reaction Fumble', () => {
        // Feral character with 'feral_reaction_fumble' trait
        // Rolls a 1 (Critical Success normally) -> Becomes Critical Failure if they are the only one who rolled 1?
        // Wait, logic says: "feralFumble = ones.length === 1 && ferals.length > 0"
        
        const feral = createTestCharacter({ 
            id: 'feral', 
            name: 'Feral', 
            position: { x: 0, y: 0 },
            stats: { reactions: 3 }
        });
        feral.specialAbilities = ['feral_reaction_fumble'];

        const other = createTestCharacter({ id: 'other', name: 'Normie', position: { x: 0, y: 1 }, stats: { reactions: 3 } });

        const battle = createMinimalBattle({ participants: [feral, other] });

        // Rolls:
        // Feral: 1 (Would be success)
        // Other: 2 (Success)
        // Result: Feral has unique 1 -> Fumble triggered?
        // Logic check: "ones = diceRolls.filter(r => r === 1)". Length is 1.
        // "ferals.length > 0". True.
        // "feralFumble = true".
        
        // Then: "fumbleDie = 1". "feralSuccess = fumbleDie <= feralStats.reactions".
        // Wait, the logic in coreResolverMiddleware seems to re-evaluate success?
        // `const feralSuccess = !caughtOffGuard && fumbleDie <= feralStats.reactions;`
        // So it logs 'log.trait.feralFumble' but then sets success based on stats?
        // Usually "Fumble" implies failure.
        // Let's check the code implementation in snapshot.
        // If the code says "success = 1 <= 3", then it is still a success, just logged as fumble event?
        // Or is there a logic bug/feature I should capture?
        
        mockRng.queueD6(1, 2);
        vi.mocked(rollD6).mockImplementation(() => mockRng.d6());

        const action: PlayerAction = { type: 'roll_initiative', payload: {} };
        const { logEntries } = runMiddleware(battle, action);

        const logKeys = logEntries.map(l => (typeof l === 'string' ? l : l.key));
        expect(logKeys).toMatchSnapshot();
        
        // Expect feral fumble log
        expect(logKeys).toContain('log.trait.feralFumble');
        
        // Baseline: fumble log appears but success may remain true in current implementation
        // Feral success check: 1 <= 3 (stats) -> true.
        expect(battle.reactionRolls['feral'].success).toBe(true);
        
        expect(createBattleSignature(battle)).toMatchSnapshot();
        
        mockRng.assertEmpty();
    });
  });
});