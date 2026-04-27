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
        isImpassable: blocksLoS,
        baseElevation: 0,
        objectHeight: 1,
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

describe('visibilityRules: hasLineOfSight — height-aware (rulebook: shooting across linear obstacles)', () => {
    const createState = (terrain: Terrain[] = []): EngineBattleState => ({
        schemaVersion: 1,
        battle: {
            terrain,
            participants: [],
            gridSize: { width: 16, height: 16 },
            log: []
        } as unknown as Battle,
        rng: { cursor: 0, seed: 123 }
    });

    const wallAt = (x: number, y: number, objectHeight = 2): Terrain => ({
        id: `wall_${x}_${y}`,
        name: 'Wall',
        type: 'Block',
        position: { x, y },
        size: { width: 1, height: 1 },
        isDifficult: false,
        providesCover: true,
        blocksLineOfSight: true,
        isImpassable: true,
        baseElevation: 0,
        objectHeight,
    });

    const roofAt = (x: number, y: number, w: number, h: number): Terrain => ({
        id: `roof_${x}_${y}`,
        name: 'Building Roof',
        type: 'Area',
        position: { x, y },
        size: { width: w, height: h },
        isDifficult: false,
        providesCover: false,
        blocksLineOfSight: false,
        isImpassable: false,
        baseElevation: 2,
        objectHeight: 0,
    });

    it('a 2-tall wall between two ground-level figures blocks LoS', () => {
        const state = createState([wallAt(5, 5)]);
        expect(hasLineOfSight(state, { x: 2, y: 5 }, { x: 8, y: 5 })).toBe(false);
    });

    it('shooter on a roof (figureZ=2) sees over a 2-tall wall', () => {
        const state = createState([
            roofAt(0, 4, 4, 4),       // roof spans (0..3, 4..7) at elevation 2
            wallAt(5, 5),
        ]);
        // Shooter standing inside the roof footprint → figureZ = 2 ≥ wall.top (2)
        expect(hasLineOfSight(state, { x: 2, y: 5 }, { x: 8, y: 5 })).toBe(true);
    });

    it('symmetry: target on a roof is also visible over the wall', () => {
        const state = createState([
            wallAt(5, 5),
            roofAt(8, 4, 4, 4),       // roof at the target side
        ]);
        expect(hasLineOfSight(state, { x: 2, y: 5 }, { x: 9, y: 5 })).toBe(true);
    });

    it('shooter on a 1-unit hill still blocked by a 2-tall wall (1 < 2)', () => {
        const hill: Terrain = {
            id: 'hill',
            name: 'Hill',
            type: 'Area',
            position: { x: 0, y: 4 },
            size: { width: 4, height: 4 },
            isDifficult: true,
            providesCover: true,
            blocksLineOfSight: false,
            isImpassable: false,
            baseElevation: 0,
            objectHeight: 1,
        };
        const state = createState([hill, wallAt(5, 5)]);
        expect(hasLineOfSight(state, { x: 2, y: 5 }, { x: 8, y: 5 })).toBe(false);
    });

    it('shooter on hill (figureZ=1) sees over a 1-tall LoS-blocking obstacle', () => {
        // Hypothetical low LoS-blocker (e.g. a 1-tall hedge / smoke prop).
        const lowHedge: Terrain = {
            id: 'hedge',
            name: 'Hedge',
            type: 'Linear',
            position: { x: 5, y: 5 },
            size: { width: 1, height: 1 },
            isDifficult: false,
            providesCover: true,
            blocksLineOfSight: true,
            isImpassable: false,
            baseElevation: 0,
            objectHeight: 1,
        };
        const hill: Terrain = {
            id: 'hill',
            name: 'Hill',
            type: 'Area',
            position: { x: 0, y: 4 },
            size: { width: 4, height: 4 },
            isDifficult: true,
            providesCover: true,
            blocksLineOfSight: false,
            isImpassable: false,
            baseElevation: 0,
            objectHeight: 1,
        };
        const state = createState([hill, lowHedge]);
        expect(hasLineOfSight(state, { x: 2, y: 5 }, { x: 8, y: 5 })).toBe(true);
    });

    it('door (walkable, opaque) blocks LoS via losBlockerHeight', () => {
        // A closed door is walkable (figures pass through) but opaque to
        // LoS. losBlockerHeight: 2 captures the LoS opacity without
        // giving the door physical thickness for movement.
        const door: Terrain = {
            id: 'door',
            name: 'Door',
            type: 'Door',
            position: { x: 5, y: 5 },
            size: { width: 1, height: 1 },
            isDifficult: false,
            providesCover: true,
            blocksLineOfSight: true,
            isImpassable: false,
            baseElevation: 0,
            objectHeight: 0,
            losBlockerHeight: 2,
        };
        const state = createState([door]);
        expect(hasLineOfSight(state, { x: 2, y: 5 }, { x: 8, y: 5 })).toBe(false);
    });
});

describe('visibilityRules: calculateCover — height-aware + within-1-of-firer', () => {
    const createState = (terrain: Terrain[] = []): EngineBattleState => ({
        schemaVersion: 1,
        battle: {
            terrain,
            participants: [],
            gridSize: { width: 16, height: 16 },
            log: []
        } as unknown as Battle,
        rng: { cursor: 0, seed: 123 }
    });

    const crateAt = (x: number, y: number, objectHeight = 1): Terrain => ({
        id: `crate_${x}_${y}`,
        name: 'Container',
        type: 'Block',
        position: { x, y },
        size: { width: 1, height: 1 },
        isDifficult: false,
        providesCover: true,
        blocksLineOfSight: false, // does not block LoS, only cover
        isImpassable: false,
        baseElevation: 0,
        objectHeight,
    });

    const roofAt = (x: number, y: number, w: number, h: number): Terrain => ({
        id: `roof_${x}_${y}`,
        name: 'Building Roof',
        type: 'Area',
        position: { x, y },
        size: { width: w, height: h },
        isDifficult: false,
        providesCover: false,
        blocksLineOfSight: false,
        isImpassable: false,
        baseElevation: 2,
        objectHeight: 0,
    });

    it('cover applies between two ground-level figures with a crate in between', () => {
        const state = createState([crateAt(5, 5)]);
        // Attacker far enough from crate (Chebyshev 3 > 1).
        expect(calculateCover(state, { x: 2, y: 5 }, { x: 8, y: 5 })).toBe(true);
    });

    it('shooter on a roof (figureZ=2) negates cover from a 1-tall crate', () => {
        const state = createState([
            roofAt(0, 4, 4, 4),
            crateAt(5, 5),
        ]);
        expect(calculateCover(state, { x: 2, y: 5 }, { x: 8, y: 5 })).toBe(false);
    });

    it('target on a roof negates cover symmetrically', () => {
        const state = createState([
            crateAt(5, 5),
            roofAt(8, 4, 4, 4),
        ]);
        expect(calculateCover(state, { x: 2, y: 5 }, { x: 9, y: 5 })).toBe(false);
    });

    it('firer within 1 cell of the cover piece — no cover (leaning over the wall)', () => {
        // Firer at (4,5), crate at (5,5): Chebyshev 1 ≤ 1 → cover skipped.
        const state = createState([crateAt(5, 5)]);
        expect(calculateCover(state, { x: 4, y: 5 }, { x: 8, y: 5 })).toBe(false);
    });

    it('firer exactly 2 cells away — cover applies', () => {
        const state = createState([crateAt(5, 5)]);
        expect(calculateCover(state, { x: 3, y: 5 }, { x: 8, y: 5 })).toBe(true);
    });

});

describe('visibilityRules: hasLineOfSight — Area features (LoS terminates at nearest edge)', () => {
    const createState = (terrain: Terrain[] = []): EngineBattleState => ({
        schemaVersion: 1,
        battle: {
            terrain,
            participants: [],
            gridSize: { width: 20, height: 20 },
            log: []
        } as unknown as Battle,
        rng: { cursor: 0, seed: 123 }
    });

    // A "forest"-style Area: conceals figures inside (LoS edge rule).
    const forestAt = (x: number, y: number, w: number, h: number): Terrain => ({
        id: `forest_${x}_${y}_${w}x${h}`,
        name: 'Forest',
        type: 'Area',
        position: { x, y },
        size: { width: w, height: h },
        isDifficult: true,
        providesCover: true,
        blocksLineOfSight: false,
        isImpassable: false,
        concealsLineOfSight: true,
        baseElevation: 0,
        objectHeight: 0,
    });

    it('target on the near edge of an Area is visible from outside', () => {
        // Forest spans (5..9, 4..7). Shooter at (2,5), target at (5,5) — nearest edge cell.
        const state = createState([forestAt(5, 4, 5, 4)]);
        expect(hasLineOfSight(state, { x: 2, y: 5 }, { x: 5, y: 5 })).toBe(true);
    });

    it('target deep inside an Area is NOT visible from outside (LoS terminates at edge)', () => {
        // Forest spans (5..9, 4..7). Shooter at (2,5), target at (8,5) — 3 cells inside.
        const state = createState([forestAt(5, 4, 5, 4)]);
        expect(hasLineOfSight(state, { x: 2, y: 5 }, { x: 8, y: 5 })).toBe(false);
    });

    it('shooter on the near edge of their own Area can see outside targets', () => {
        // Symmetric case — shooter at (5,5) on the edge facing target outside at (2,5).
        const state = createState([forestAt(5, 4, 5, 4)]);
        expect(hasLineOfSight(state, { x: 5, y: 5 }, { x: 2, y: 5 })).toBe(true);
    });

    it('shooter deep inside an Area cannot see outside targets', () => {
        // Shooter at (8,5), several cells deep into the forest.
        const state = createState([forestAt(5, 4, 5, 4)]);
        expect(hasLineOfSight(state, { x: 8, y: 5 }, { x: 2, y: 5 })).toBe(false);
    });

    it('two figures inside the same Area can see each other within 3 cells', () => {
        // Both inside forest, Chebyshev = 3.
        const state = createState([forestAt(5, 4, 5, 4)]);
        expect(hasLineOfSight(state, { x: 5, y: 5 }, { x: 8, y: 5 })).toBe(true);
    });

    it('two figures inside the same Area cannot see each other beyond 3 cells', () => {
        // Forest spans (5..14, 4..7). Both inside, Chebyshev = 4.
        const state = createState([forestAt(5, 4, 10, 4)]);
        expect(hasLineOfSight(state, { x: 5, y: 5 }, { x: 9, y: 5 })).toBe(false);
    });

    it('a pass-through Area (neither end inside) does not block LoS', () => {
        // Forest spans (4..6, 4..6); shooter at (2,5), target at (8,5) — ray crosses forest.
        const state = createState([forestAt(4, 4, 3, 3)]);
        expect(hasLineOfSight(state, { x: 2, y: 5 }, { x: 8, y: 5 })).toBe(true);
    });
});
