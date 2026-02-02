import { describe, it, expect } from 'vitest';
import { useConsumable } from './useConsumable';
import { EngineBattleState, BattleAction } from '../types';
import { Battle, BattleParticipant } from '@/types/battle';

// Helper to create valid participant structure
const createParticipant = (overrides: Partial<BattleParticipant>): BattleParticipant => ({
    id: 'p-1',
    type: 'character',
    name: 'Test',
    pronouns: 'they/them',
    consumables: [],
    activeEffects: [],
    status: 'active',
    stunTokens: 0,
    stats: { speed: 4, reactions: 3, combat: 3, toughness: 3, savvy: 3, luck: 0 },
    actionsRemaining: 2,
    actionsTaken: { move: false, combat: false, dash: false, interact: false },
    position: { x: 0, y: 0 },
    weapons: [],
    implants: [],
    utilityDevices: [],
    backstory: '',
    injuries: [],
    task: 'idle',
    raceId: 'baseline_human',
    backgroundId: 'bg-1',
    motivationId: 'mot-1',
    classId: 'cls-1',
    xp: 0,
    currentLuck: 0,
    consumablesUsedThisTurn: 0,
    ...overrides
} as BattleParticipant);

describe('useConsumable', () => {
    const createMockState = (): EngineBattleState => ({
        schemaVersion: 1,
        battle: {
            id: 'battle-1',
            participants: [
                createParticipant({
                    id: 'host-1',
                    consumables: ['booster_pills', 'booster_pills'],
                    stunTokens: 1
                }),
                createParticipant({
                    id: 'guest-1',
                    position: { x: 1, y: 0 }
                })
            ],
            terrain: [],
            mission: { type: 'Patrol', objectivePosition: { x: 10, y: 10 } },
            round: 1,
            phase: 'slow_actions',
            rngSeed: 123,
            log: []
        } as unknown as Battle,
        rng: { cursor: 0, seed: 123 }
    });

    it('consumes booster_pills correctly', () => {
        const state = createMockState();
        const action: BattleAction = {
            type: 'USE_CONSUMABLE',
            participantId: 'host-1',
            consumableId: 'booster_pills'
        };

        const result = useConsumable(state, action);
        const user = result.next.battle.participants.find(p => p.id === 'host-1')!;

        // 1. Removed one pill
        expect(user.consumables).toEqual(['booster_pills']);
        
        // 2. Added effect
        expect(user.activeEffects).toHaveLength(1);
        expect(user.activeEffects[0].sourceId).toBe('booster_pills');
        expect(user.activeEffects[0].statModifiers?.speed).toBe(1); // Check additive logic
        
        // 3. Removed stun tokens
        expect(user.stunTokens).toBe(0);
        
        // 4. Did not cost action (first consumable is free)
        expect(user.actionsRemaining).toBe(2); 
        expect(user.consumablesUsedThisTurn).toBe(1);

        // Check immutability: original state should not be modified
        expect(state.battle.participants[0].consumables).toHaveLength(2);
        expect(state.battle.participants[0].stunTokens).toBe(1);
    });

    it('consumes action point for second consumable', () => {
        const state = createMockState();
        // Modify state for setup (in test only)
        state.battle.participants[0].consumablesUsedThisTurn = 1;

        const action: BattleAction = {
            type: 'USE_CONSUMABLE',
            participantId: 'host-1',
            consumableId: 'booster_pills'
        };

        const result = useConsumable(state, action);
        const updatedUser = result.next.battle.participants.find(p => p.id === 'host-1')!;

        expect(updatedUser.actionsRemaining).toBe(1);
        expect(updatedUser.consumablesUsedThisTurn).toBe(2);
        expect(updatedUser.actionsTaken.combat).toBe(true);
    });

    it('consumes action and ends turn if AP reaches 0', () => {
        const state = createMockState();
        // Setup: user has already used 1 consumable and has 1 AP left
        const user = state.battle.participants[0];
        user.consumablesUsedThisTurn = 1;
        user.actionsRemaining = 1;
        user.consumables = ['booster_pills', 'booster_pills'];

        const action: BattleAction = {
            type: 'USE_CONSUMABLE',
            participantId: 'host-1',
            consumableId: 'booster_pills'
        };

        const result = useConsumable(state, action);
        const updatedUser = result.next.battle.participants.find(p => p.id === 'host-1')!;

        // Expect: -1 AP (becomes 0), combat action taken, and full turn ended flags
        expect(updatedUser.actionsRemaining).toBe(0);
        expect(updatedUser.consumablesUsedThisTurn).toBe(2);
        expect(updatedUser.actionsTaken.combat).toBe(true);
        // Logic: if actionsRemaining <= 0 -> set all actionsTaken to true
        expect(updatedUser.actionsTaken.move).toBe(true);
        expect(updatedUser.actionsTaken.dash).toBe(true);
        expect(updatedUser.actionsTaken.interact).toBe(true);
    });

    it('kiranin_crystals dazes opponents', () => {
        const state = createMockState();
        // Let's create a specific state for this test
        const kiraninState = createMockState();
        kiraninState.battle.participants[0].consumables = ['kiranin_crystals'];

        const action: BattleAction = {
            type: 'USE_CONSUMABLE',
            participantId: 'host-1',
            consumableId: 'kiranin_crystals'
        };

        const result = useConsumable(kiraninState, action);
        const opponent = result.next.battle.participants.find(p => p.id === 'guest-1')!;

        // Opponent is close (dist 1), active, and has 2 actions. Should be dazed.
        expect(opponent.status).toBe('dazed');
        
        // Verify only ONE event (for the user), no per-target events
        const userEvents = result.events.filter(e => e.type === 'CONSUMABLE_USED');
        expect(userEvents).toHaveLength(1);
        expect(userEvents[0].participantId).toBe('host-1');
        expect(userEvents[0].consumableId).toBe('kiranin_crystals');

        // Check immutability
        expect(kiraninState.battle.participants[1].status).toBe('active');
    });

    it('kiranin_crystals with no targets (range)', () => {
        const state = createMockState();
        const user = state.battle.participants[0];
        user.consumables = ['kiranin_crystals'];
        
        // Opponent is far away (> 4)
        const opponent = state.battle.participants[1];
        opponent.position = { x: 10, y: 0 }; 

        const action: BattleAction = {
            type: 'USE_CONSUMABLE',
            participantId: 'host-1',
            consumableId: 'kiranin_crystals'
        };

        const result = useConsumable(state, action);
        
        // No status change
        expect(result.next.battle.participants[1].status).toBe('active');
        
        // Still produces 1 event
        const events = result.events.filter(e => e.type === 'CONSUMABLE_USED');
        expect(events).toHaveLength(1);
    });
});
