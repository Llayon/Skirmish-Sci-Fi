import { describe, it, expect } from 'vitest';
import { generateDefensiveAIPlan } from './defensiveAI';
import { EngineBattleState, EngineDeps } from '../types';
import { Battle, BattleParticipant, Terrain } from '@/types';
import { ShootingWeapon } from '../rules/shootingRules';

describe('defensiveAI: generateDefensiveAIPlan', () => {
    const createParticipant = (id: string, pos: { x: number, y: number }, side: 'player' | 'enemy' = 'enemy'): BattleParticipant => ({
        id,
        name: id,
        position: pos,
        status: 'active',
        stats: { speed: 4, reactions: 3, combat: 3, toughness: 3, savvy: 3, aim: 0, luck: 0 },
        type: side === 'player' ? 'character' : 'enemy',
        side,
        weapons: [{ id: 'rifle', range: 24, shots: 1, damage: 1, traits: [] } as ShootingWeapon],
        activeEffects: [],
        consumables: [],
        stunTokens: 0,
        actionsRemaining: 2,
        actionsTaken: { move: false, combat: false, dash: false, interact: false },
        currentLuck: 0,
        consumablesUsedThisTurn: 0,
        utilityDevices: []
    } as unknown as BattleParticipant);

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
        const actor = createParticipant('Guard', { x: 4, y: 5 }, 'enemy'); 
        const player = createParticipant('Intruder', { x: 15, y: 5 }, 'player'); 
        
        // Add cover at (7,6) - NOT on the direct line (4,5)-(15,5)
        const cover: Terrain = { 
            id: 'c1', name: 'Sandbags', type: 'Obstacle', 
            position: { x: 7, y: 6 }, size: { width: 1, height: 1 }, 
            providesCover: true, blocksLineOfSight: false, isDifficult: false, isImpassable: false
        };
        
        const state = createState([actor, player]);
        state.battle.terrain.push(cover);

        const { actions } = generateDefensiveAIPlan(state, actor.id, deps);

        // Expected: Move to (7,6) to get cover and then SHOOT
        expect(actions.some(a => a.type === 'MOVE_PARTICIPANT')).toBe(true);
        expect(actions.some(a => a.type === 'SHOOT_ATTACK')).toBe(true);
    });

    it('Scenario 2: Defensive AI brawls if opponent enters its terrain', () => {
        const actor = createParticipant('Guard', { x: 4, y: 5 }, 'enemy');
        const player = createParticipant('Intruder', { x: 5, y: 5 }, 'player'); 
        const state = createState([actor, player]);

        const { actions } = generateDefensiveAIPlan(state, actor.id, deps);

        expect(actions.some(a => a.type === 'BRAWL_ATTACK')).toBe(true);
    });
});
