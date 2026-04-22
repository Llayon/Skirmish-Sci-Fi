import { describe, it, expect } from 'vitest';
import { generateGuardianAIPlan } from './guardianAI';
import { EngineBattleState, EngineDeps } from '../types';
import { Battle, BattleParticipant } from '@/types';

describe('guardianAI: generateGuardianAIPlan', () => {
    const createParticipant = (id: string, pos: { x: number, y: number }): BattleParticipant => ({
        id,
        name: id,
        position: pos,
        status: 'active',
        stats: { speed: 4, reactions: 3, combat: 3, toughness: 3, savvy: 3, aim: 0 },
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
            gridSize: { width: 20, height: 20 }
        } as unknown as Battle,
        rng: { cursor: 0, seed: 123 }
    });

    const deps: EngineDeps = {
        rng: {
            d6: (s: any) => ({ value: 1, next: s }),
            d100: (s: any) => ({ value: 50, next: s })
        }
    };

    it('Scenario 1: Guardian follows Lead when out of tether range', () => {
        const lead = createParticipant('Master', { x: 0, y: 0 });
        const actor = createParticipant('Drone', { x: 10, y: 0 });
        const player = createParticipant('Player', { x: 0, y: 5 });
        const state = createState([lead, actor, player]);

        const { actions } = generateGuardianAIPlan(state, actor.id, deps, lead.id);

        // Expected: Move towards Master (from 10,0 to around 6,0)
        expect(actions.some(a => a.type === 'MOVE_PARTICIPANT')).toBe(true);
        const moveAction = actions.find(a => a.type === 'MOVE_PARTICIPANT') as any;
        expect(moveAction.to.x).toBeLessThan(10);
    });

    it('Scenario 2: Guardian shoots at target near Lead', () => {
        const lead = createParticipant('Master', { x: 0, y: 0 });
        const actor = createParticipant('Drone', { x: 1, y: 1 }); // Already close
        const player = createParticipant('Player', { x: 0, y: 5 });
        const state = createState([lead, actor, player]);

        const { actions } = generateGuardianAIPlan(state, actor.id, deps, lead.id);

        expect(actions).toHaveLength(1);
        expect(actions[0]).toMatchObject({ type: 'SHOOT_ATTACK', targetId: 'Player' });
    });
});
