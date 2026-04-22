import { describe, it, expect } from 'vitest';
import { calculateCover, hasLineOfSight } from './visibilityRules';
import { EngineBattleState } from '../types';
import { Battle, Terrain, BattleParticipant } from '@/types/battle';

describe('visibilityRules: calculateCover', () => {
    const createParticipant = (id: string, pos: { x: number, y: number }, side: 'player' | 'enemy' = 'player'): BattleParticipant => ({
        id,
        name: id,
        position: pos,
        status: 'active',
        stats: { speed: 4, reactions: 3, combat: 3, toughness: 3, savvy: 3, aim: 0, luck: 0 },
        type: side === 'player' ? 'character' : 'enemy',
        side,
        consumables: [],
        activeEffects: [],
        stunTokens: 0,
        actionsRemaining: 2,
        actionsTaken: { move: false, combat: false, dash: false, interact: false },
        weapons: [],
        currentLuck: 0,
        consumablesUsedThisTurn: 0,
        utilityDevices: []
    } as unknown as BattleParticipant);

    const createState = (terrain: Terrain[] = []): EngineBattleState => ({
        schemaVersion: 1,
        battle: {
            terrain,
            participants: [],
            gridSize: { width: 10, height: 10 }
        } as unknown as Battle,
        rng: { cursor: 0, seed: 123 }
    });

    const mockTerrain = (id: string, type: any, pos: {x:number, y:number}, blocksLoS: boolean, providesCover: boolean): Terrain => ({
        id,
        name: id,
        type,
        position: pos,
        size: { width: 1, height: 1 },
        blocksLineOfSight: blocksLoS,
        providesCover: providesCover,
        isDifficult: false,
        isImpassable: blocksLoS
    } as Terrain);

    it('Scenario 1: Target behind an obstacle has cover', () => {
        const crate = mockTerrain('crate', 'Obstacle', { x: 5, y: 5 }, false, true);
        const state = createState([crate]);
        
        const res = calculateCover(state, { x: 2, y: 5 }, { x: 8, y: 5 });
        expect(res).toBe(true);
    });

    it('Scenario 2: Target behind a wall has NO cover (because NO LoS)', () => {
        const wall = mockTerrain('wall', 'Wall', { x: 5, y: 5 }, true, true);
        const state = createState([wall]);
        
        expect(hasLineOfSight(state, { x: 2, y: 5 }, { x: 8, y: 5 })).toBe(false);
        
        const res = calculateCover(state, { x: 2, y: 5 }, { x: 8, y: 5 });
        expect(res).toBe(false);
    });

    it('Scenario 3: Target in the open has NO cover', () => {
        const state = createState([]);
        const res = calculateCover(state, { x: 0, y: 0 }, { x: 5, y: 5 });
        expect(res).toBe(false);
    });
});
