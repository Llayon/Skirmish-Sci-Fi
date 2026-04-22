import { describe, it, expect } from 'vitest';
import { generateDefensiveAIPlan } from './defensiveAI';
import { EngineBattleState, EngineDeps } from '../types';
import { Battle, BattleParticipant } from '@/types';
import { ShootingWeapon } from '../rules/shootingRules';

describe('defensiveAI: generateDefensiveAIPlan', () => {
    const createParticipant = (id: string, pos: { x: number, y: number }): BattleParticipant => ({
        id,
        name: id,
        position: pos,
        status: 'active',
        stats: { speed: 4, reactions: 3, combat: 3, toughness: 3, savvy: 3, aim: 0 },
        type: 'character',
        weapons: [{ id: 'rifle', range: 24, shots: 1, damage: 1, traits: [] } as ShootingWeapon],
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
            gridSize: { width: 20, height: 20 }
        } as unknown as Battle,
        rng: { cursor: 0, seed: 123 }
    });

    const deps: EngineDeps = {
        rng: {
            d6: (s) => ({ value: 1, next: s }),
            d100: (s) => ({ value: 50, next: s })
        }
    } as EngineDeps;

    it('Scenario 1: Defensive AI stays within its half of the table', () => {
        const actor = createParticipant('Guard', { x: 4, y: 5 }); // Left half (mid is 10)
        const player = createParticipant('Intruder', { x: 15, y: 5 }); // Right half
        
        // Add cover near the mid-line (x=8)
        const cover: Terrain = { 
            id: 'c1', name: 'Sandbags', type: 'Obstacle', 
            position: { x: 8, y: 5 }, size: { width: 1, height: 1 }, 
            providesCover: true, blocksLineOfSight: false, isDifficult: false, isImpassable: false
        };
        
        const state = createState([actor, player]);
        state.battle.terrain.push(cover);

        const { actions } = generateDefensiveAIPlan(state, actor.id, deps);

        // Expected: Move towards cover at x=8
        const moveAction = actions.find(a => a.type === 'MOVE_PARTICIPANT');
        if (moveAction && moveAction.type === 'MOVE_PARTICIPANT') {
            expect(moveAction.to.x).toBe(8); // Should move to cover
            expect(moveAction.to.x).toBeLessThan(10); // Still in home half
        }
    });

    it('Scenario 2: Defensive AI brawls if opponent enters its terrain', () => {
        const actor = createParticipant('Guard', { x: 4, y: 5 });
        const player = createParticipant('Intruder', { x: 5, y: 5 }); // Adjacent
        const state = createState([actor, player]);

        const { actions } = generateDefensiveAIPlan(state, actor.id, deps);

        expect(actions.some(a => a.type === 'BRAWL_ATTACK')).toBe(true);
    });
});
