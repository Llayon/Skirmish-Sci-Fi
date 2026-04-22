import { describe, it, expect } from 'vitest';
import { generateRampagingAIPlan } from './rampagingAI';
import { EngineBattleState, EngineDeps } from '../types';
import { Battle, BattleParticipant } from '@/types';
import { ShootingWeapon } from '../rules/shootingRules';

describe('rampagingAI: generateRampagingAIPlan', () => {
    const createParticipant = (id: string, pos: { x: number, y: number }): BattleParticipant => ({
        id,
        name: id,
        position: pos,
        status: 'active',
        stats: { speed: 4, reactions: 3, combat: 3, toughness: 3, savvy: 3, aim: 0 },
        type: 'character',
        weapons: [{ id: 'teeth', range: 1, shots: 1, damage: 1, traits: [] } as ShootingWeapon],
        activeEffects: [],
        consumables: [],
        stunTokens: 0,
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
            d6: (s) => ({ value: 1, next: s }),
            d100: (s) => ({ value: 50, next: s })
        }
    } as EngineDeps;

    it('Rampaging enemy charges closest target regardless of combat skill', () => {
        const actor = createParticipant('Beast', { x: 0, y: 0 });
        const player = createParticipant('Player', { x: 2, y: 0 });
        const state = createState([actor, player]);

        const { actions } = generateRampagingAIPlan(state, actor.id, deps);

        expect(actions).toHaveLength(2);
        expect(actions[0]).toMatchObject({ type: 'MOVE_PARTICIPANT', to: { x: 1, y: 0 } });
        expect(actions[1]).toMatchObject({ type: 'BRAWL_ATTACK', targetId: 'Player' });
    });
});
