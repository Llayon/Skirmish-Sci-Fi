import { describe, it, expect } from 'vitest';
import { getFigureZ, hasHeightAdvantage } from './goodShotRules';
import type { EngineBattleState } from '../types';
import type { Battle, Terrain } from '@/types/battle';

function makeTerrain(over: Partial<Terrain>): Terrain {
    return {
        id: 't',
        name: 'X',
        type: 'Block',
        position: { x: 0, y: 0 },
        size: { width: 1, height: 1 },
        isDifficult: false,
        providesCover: false,
        blocksLineOfSight: false,
        isImpassable: false,
        baseElevation: 0,
        objectHeight: 0,
        ...over,
    };
}

function makeState(terrain: Terrain[]): EngineBattleState {
    return {
        schemaVersion: 1,
        battle: {
            terrain,
            participants: [],
            gridSize: { width: 16, height: 16 },
        } as unknown as Battle,
        rng: { seed: 0, cursor: 0 },
    };
}

describe('goodShotRules.getFigureZ', () => {
    it('returns 0 on open ground (no terrain in cell)', () => {
        const state = makeState([]);
        expect(getFigureZ(state, { x: 5, y: 5 })).toBe(0);
    });

    it('returns 2 for a figure standing on a roof (baseElevation 2, objectHeight 0)', () => {
        const state = makeState([
            makeTerrain({
                id: 'roof',
                name: 'Building Roof',
                type: 'Area',
                position: { x: 3, y: 3 },
                size: { width: 4, height: 4 },
                baseElevation: 2,
                objectHeight: 0,
            }),
        ]);
        expect(getFigureZ(state, { x: 4, y: 4 })).toBe(2);
    });

    it('returns 1 for a figure standing on a hill (objectHeight 1)', () => {
        const state = makeState([
            makeTerrain({
                id: 'hill',
                name: 'Hill',
                type: 'Area',
                position: { x: 0, y: 0 },
                size: { width: 5, height: 5 },
                isDifficult: true,
                objectHeight: 1,
            }),
        ]);
        expect(getFigureZ(state, { x: 2, y: 2 })).toBe(1);
    });

    it('ignores impassable terrain (figure cannot stand on a wall)', () => {
        const state = makeState([
            makeTerrain({
                id: 'wall',
                name: 'Wall',
                type: 'Block',
                position: { x: 5, y: 5 },
                isImpassable: true,
                objectHeight: 2,
            }),
        ]);
        // Even though a wall occupies this cell, a figure here doesn't get
        // height — it shouldn't be able to be there. Returns 0 (ground).
        expect(getFigureZ(state, { x: 5, y: 5 })).toBe(0);
    });

    it('picks the max height when multiple walkable surfaces overlap', () => {
        // Hypothetical: a hill (objectHeight 1) and a roof (baseElevation 2)
        // share the same cell — figure stands on whichever is higher.
        const state = makeState([
            makeTerrain({
                id: 'hill',
                name: 'Hill',
                position: { x: 5, y: 5 },
                objectHeight: 1,
            }),
            makeTerrain({
                id: 'roof',
                name: 'Building Roof',
                position: { x: 5, y: 5 },
                baseElevation: 2,
                objectHeight: 0,
            }),
        ]);
        expect(getFigureZ(state, { x: 5, y: 5 })).toBe(2);
    });

    it('treats Interior as ground level (baseElevation 0, objectHeight 0)', () => {
        const state = makeState([
            makeTerrain({
                id: 'i',
                name: 'Building Interior',
                type: 'Interior',
                position: { x: 3, y: 3 },
                size: { width: 4, height: 4 },
                objectHeight: 0,
            }),
        ]);
        expect(getFigureZ(state, { x: 4, y: 4 })).toBe(0);
    });
});

describe('goodShotRules.hasHeightAdvantage', () => {
    const roof = makeTerrain({
        id: 'roof',
        name: 'Building Roof',
        type: 'Area',
        position: { x: 0, y: 0 },
        size: { width: 4, height: 4 },
        baseElevation: 2,
        objectHeight: 0,
    });

    it('shooter on roof, target on ground → advantage', () => {
        const state = makeState([roof]);
        expect(hasHeightAdvantage(state, { x: 1, y: 1 }, { x: 8, y: 8 })).toBe(true);
    });

    it('both on ground → no advantage', () => {
        const state = makeState([]);
        expect(hasHeightAdvantage(state, { x: 1, y: 1 }, { x: 8, y: 8 })).toBe(false);
    });

    it('shooter lower than target → no advantage', () => {
        const state = makeState([roof]);
        expect(hasHeightAdvantage(state, { x: 8, y: 8 }, { x: 1, y: 1 })).toBe(false);
    });

    it('exactly 1 unit higher → advantage (rulebook "at least one figure height")', () => {
        const hill = makeTerrain({
            id: 'h',
            name: 'Hill',
            position: { x: 0, y: 0 },
            size: { width: 4, height: 4 },
            objectHeight: 1,
        });
        const state = makeState([hill]);
        expect(hasHeightAdvantage(state, { x: 1, y: 1 }, { x: 8, y: 8 })).toBe(true);
    });

    it('both on the same roof → no advantage', () => {
        const state = makeState([roof]);
        expect(hasHeightAdvantage(state, { x: 1, y: 1 }, { x: 2, y: 2 })).toBe(false);
    });
});
