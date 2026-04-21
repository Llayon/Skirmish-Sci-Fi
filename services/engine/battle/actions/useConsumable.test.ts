import { describe, it, expect } from 'vitest';
import { useConsumable } from './useConsumable';
import { EngineBattleState, BattleAction } from '../types';
import { Battle, BattleParticipant } from '@/types/battle';

// Helper to create valid participant structure
const createParticipant = (overrides: Partial<BattleParticipant>): BattleParticipant => ({
    id: 'p-1',
    type: 'character',
    name: 'Test',
    consumables: [],
    activeEffects: [],
    status: 'active',
    stunTokens: 0,
    stats: { speed: 4, reactions: 3, combat: 3, toughness: 3, savvy: 3, aim: 0 },
    actionsRemaining: 2,
    actionsTaken: { move: false, combat: false, dash: false, interact: false },
    position: { x: 0, y: 0 },
    weapons: [],
    ...overrides
});

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

    it('kiranin_crystals dazes opponents', () => {
        const state = createMockState();
        const user = state.battle.participants[0]; // host-1
        // Need to forcefully set consumable because createMockState helper puts booster_pills
        // But we can just use booster_pills in array but call action with kiranin_crystals?
        // No, logic checks indexOf.
        
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
        
        const event = result.events.find(e => e.type === 'CONSUMABLE_USED' && e.targetId === 'guest-1');
        expect(event).toBeDefined();

        // Check immutability
        expect(kiraninState.battle.participants[1].status).toBe('active');
    });
});
