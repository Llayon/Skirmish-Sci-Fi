import { describe, it, expect } from 'vitest';
import { generateBeastAIPlan } from './beastAI';
import { EngineBattleState, EngineDeps } from '../types';
import { Battle, BattleParticipant, Terrain } from '@/types';

describe('beastAI: generateBeastAIPlan', () => {
    const createParticipant = (id: string, pos: { x: number, y: number }): BattleParticipant => ({
        id,
        name: id,
        position: pos,
        status: 'active',
        stats: { speed: 4, reactions: 3, combat: 3, toughness: 3, savvy: 3, aim: 0 },
        type: 'character',
        weapons: [{ id: 'claws', range: 1, shots: 1, damage: 1, traits: [] }] as any,
        actionsRemaining: 2,
        actionsTaken: { move: false, combat: false, dash: false, interact: false }
    } as BattleParticipant);

    const createState = (participants: BattleParticipant[], terrain: Terrain[] = []): EngineBattleState => ({
        schemaVersion: 1,
        battle: {
            terrain,
            participants,
            gridSize: { width: 20, height: 20 }
        } as unknown as Battle,
        rng: { cursor: 0, seed: 123 }
    });

    const deps: EngineDeps = {
        rng: {
            d100: (s: any) => ({ value: 50, next: s })
        }
    } as any;

    it('Scenario 1: Beast stalking from distance (prefer cover)', () => {
        const actor = createParticipant('Beast', { x: 0, y: 0 });
        const player = createParticipant('Player', { x: 15, y: 0 });
        // Cover at (2,1)
        const terrain: Terrain[] = [{ 
            id: 'c1', type: 'Obstacle', position: { x: 2, y: 1 }, size: { width: 1, height: 1 }, 
            providesCover: true, blocksLineOfSight: false 
        } as any];
        const state = createState([actor, player], terrain);

        const { actions } = generateBeastAIPlan(state, actor.id, deps);

        // Should move to cover at (2,1) instead of just rushing forward to (4,0)
        expect(actions).toHaveLength(1);
        expect(actions[0]).toMatchObject({ type: 'MOVE_PARTICIPANT', to: { x: 2, y: 1 } });
    });

    it('Scenario 2: Beast pounces when within move distance', () => {
        const actor = createParticipant('Beast', { x: 0, y: 0 });
        const player = createParticipant('Player', { x: 4, y: 0 }); // dist 4, speed 4
        const state = createState([actor, player]);

        const { actions } = generateBeastAIPlan(state, actor.id, deps);

        expect(actions).toHaveLength(2);
        expect(actions[0].type).toBe('MOVE_PARTICIPANT');
        expect(actions[0]).toMatchObject({ to: { x: 3, y: 0 } });
        expect(actions[1].type).toBe('BRAWL_ATTACK');
    });
});
