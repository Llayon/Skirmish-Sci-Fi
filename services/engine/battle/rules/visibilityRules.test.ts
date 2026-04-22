import { describe, it, expect } from 'vitest';
import { calculateCover, hasLineOfSight } from './visibilityRules';
import { EngineBattleState } from '../types';
import { Battle, Terrain } from '@/types/battle';

describe('visibilityRules: calculateCover', () => {
    const createState = (terrain: Terrain[] = []): EngineBattleState => ({
        schemaVersion: 1,
        battle: {
            terrain,
            participants: [],
            gridSize: { width: 10, height: 10 },
            log: []
        } as unknown as Battle,
        rng: { cursor: 0, seed: 123 }
    });

    const mockTerrain = (id: string, type: Terrain['type'], pos: {x:number, y:number}, blocksLoS: boolean, providesCover: boolean): Terrain => ({
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
