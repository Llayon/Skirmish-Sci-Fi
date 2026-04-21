import { describe, it, expect } from 'vitest';
import { generateAggressiveAIPlan } from '@/services/engine/battle/ai/aggressiveAI';
import { EngineBattleState, EngineDeps } from '@/services/engine/battle/types';
import { Battle, BattleParticipant } from '@/types';

describe('AI Parity: Aggressive behavior', () => {
    const createParticipant = (id: string, pos: { x: number, y: number }, combat: number = 3): BattleParticipant => ({
        id,
        name: id,
        position: pos,
        status: 'active',
        stats: { speed: 4, reactions: 3, combat, toughness: 3, savvy: 3, aim: 0 },
        type: 'character',
        weapons: [{ id: 'pistol', range: 12, shots: 1, damage: 1, traits: [] }] as any,
        actionsRemaining: 2,
        actionsTaken: { move: false, combat: false, dash: false, interact: false }
    } as BattleParticipant);

    const createState = (participants: BattleParticipant[]): EngineBattleState => ({
        schemaVersion: 1,
        battle: {
            terrain: [],
            participants,
            gridSize: { width: 10, height: 10 }
        } as unknown as Battle,
        rng: { cursor: 0, seed: 123 }
    });

    const deps: EngineDeps = {
        rng: {
            d6: (s: any) => ({ value: 1, next: s }),
            d100: (s: any) => ({ value: 50, next: s })
        }
    };

    it('Scenario: Aggressive enemy charges and brawls a weaker opponent', () => {
        const actor = createParticipant('Enemy', { x: 0, y: 0 }, 3);
        const player = createParticipant('Player', { x: 2, y: 0 }, 1);
        const state = createState([actor, player]);

        const { actions } = generateAggressiveAIPlan(state, actor.id, deps);

        // Expected: Move to (1,0) then Brawl at (2,0)
        expect(actions).toHaveLength(2);
        expect(actions[0]).toMatchObject({ type: 'MOVE_PARTICIPANT', to: { x: 1, y: 0 } });
        expect(actions[1]).toMatchObject({ type: 'BRAWL_ATTACK', targetId: 'Player' });
    });

    it('Scenario: Aggressive enemy with distant target moves tactical half-speed', () => {
        const actor = createParticipant('Enemy', { x: 0, y: 0 }, 3);
        const player = createParticipant('Player', { x: 15, y: 0 }, 3); // Beyond 12"
        const state = createState([actor, player]);
        state.battle.gridSize = { width: 20, height: 20 };

        const { actions } = generateAggressiveAIPlan(state, actor.id, deps);

        // Expected: Half-speed move (speed 4 -> 2 cells) then Shoot
        expect(actions).toHaveLength(2);
        expect(actions[0]).toMatchObject({ type: 'MOVE_PARTICIPANT', to: { x: 2, y: 0 } });
        expect(actions[1]).toMatchObject({ type: 'SHOOT_ATTACK', targetId: 'Player' });
    });
});
