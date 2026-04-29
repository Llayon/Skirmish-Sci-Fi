import { describe, it, expect } from 'vitest';
import { generateCautiousAIPlan } from './cautiousAI';
import { EngineBattleState, EngineDeps } from '../types';
import { Battle, BattleParticipant, Terrain } from '@/types';
import { ShootingWeapon } from '../rules/shootingRules';

describe('cautiousAI: generateCautiousAIPlan', () => {
    const createParticipant = (id: string, pos: { x: number, y: number }, side: 'player' | 'enemy' = 'enemy'): BattleParticipant => ({
        id,
        name: id,
        position: pos,
        status: 'active',
        stats: { speed: 4, reactions: 3, combat: 3, toughness: 3, savvy: 3, aim: 0, luck: 0 },
        type: side === 'player' ? 'character' : 'enemy',
        side,
        weapons: [{ id: 'sniper_rifle', range: 30, shots: 1, damage: 1, traits: [] } as ShootingWeapon],
        activeEffects: [],
        consumables: [],
        stunTokens: 0,
        actionsRemaining: 2,
        actionsTaken: { move: false, combat: false, dash: false, interact: false },
        currentLuck: 0,
        consumablesUsedThisTurn: 0,
        utilityDevices: []
    } as unknown as BattleParticipant);

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
            d6: (s) => ({ value: 1, next: s }),
            d100: (s) => ({ value: 50, next: s })
        }
    } as EngineDeps;

    it('Regression: Cautious AI shoots from cover without moving', () => {
        const actor = createParticipant('Sniper', { x: 2, y: 2 }, 'enemy');
        const player = createParticipant('Player', { x: 15, y: 15 }, 'player');
        const terrain: Terrain[] = [{ 
            id: 'c1', name: 'Sandbags', type: 'Obstacle', position: { x: 2, y: 2 }, size: { width: 1, height: 1 }, 
            providesCover: true, blocksLineOfSight: false, isDifficult: false, isImpassable: false
        } as Terrain];
        const state = createState([actor, player], terrain);

        const { actions } = generateCautiousAIPlan(state, actor.id, deps);

        expect(actions).toHaveLength(1);
        expect(actions[0].type).toBe('SHOOT_ATTACK');
    });

    it('Regression: Cautious AI moves to cover and then shoots', () => {
        const actor = createParticipant('Sniper', { x: 0, y: 0 }, 'enemy'); 
        const player = createParticipant('Player', { x: 10, y: 0 }, 'player');
        // Cover at (1,0) - actor can stay at (0,0) and have cover from (1,0) if target at (10,0)
        // Or move to (0,0) which is already in cover relative to target
        const terrain: Terrain[] = [{ 
            id: 'c1', name: 'LowWall', type: 'Obstacle', position: { x: 5, y: 0 }, size: { width: 1, height: 1 }, 
            providesCover: true, blocksLineOfSight: false, isDifficult: false, isImpassable: false
        } as Terrain];
        const state = createState([actor, player], terrain);

        const { actions } = generateCautiousAIPlan(state, actor.id, deps);

        expect(actions.some(a => a.type === 'SHOOT_ATTACK')).toBe(true);
    });
});
