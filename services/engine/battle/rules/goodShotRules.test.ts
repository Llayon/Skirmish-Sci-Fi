import { describe, it, expect } from 'vitest';
import { applyGoodShotReroll, getFigureZ, hasHeightAdvantage } from './goodShotRules';
import { createScriptedRngState, d6, d100 } from '../../rng/rng';
import type { EngineBattleState, EngineDeps } from '../types';
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

describe('applyGoodShotReroll', () => {
    const deps: EngineDeps = { rng: { d6, d100 } };

    it('returns input unchanged when ineligible', () => {
        const rng = createScriptedRngState([{ die: 'd6', value: 6 }]);
        const out = applyGoodShotReroll([1, 1, 1], rng, deps, false);
        expect(out.rolls).toEqual([1, 1, 1]);
        expect(out.rerolled).toBeNull();
        expect(out.rng).toBe(rng);
    });

    it('returns input unchanged when no roll is a 1', () => {
        const rng = createScriptedRngState([{ die: 'd6', value: 6 }]);
        const out = applyGoodShotReroll([2, 3, 4], rng, deps, true);
        expect(out.rolls).toEqual([2, 3, 4]);
        expect(out.rerolled).toBeNull();
        expect(out.rng).toBe(rng);
    });

    it('rerolls the first 1 in a multi-shot array (rulebook: single 1)', () => {
        const rng = createScriptedRngState([{ die: 'd6', value: 5 }]);
        const out = applyGoodShotReroll([3, 1, 1, 6], rng, deps, true);
        expect(out.rolls).toEqual([3, 5, 1, 6]);
        expect(out.rerolled).toEqual({ index: 1, original: 1, rerolled: 5 });
    });

    it('consumes exactly one d6 from the RNG when a reroll fires', () => {
        const rng = createScriptedRngState([{ die: 'd6', value: 4 }]);
        const out = applyGoodShotReroll([1, 1], rng, deps, true);
        // Only one reroll, even with multiple 1s — the script has only 1 entry.
        expect(out.rolls).toEqual([4, 1]);
        expect(out.rng.cursor).toBe(1);
    });

    it('1-shot path matches the original single-shot semantics', () => {
        const rng = createScriptedRngState([{ die: 'd6', value: 6 }]);
        const out = applyGoodShotReroll([1], rng, deps, true);
        expect(out.rolls).toEqual([6]);
        expect(out.rerolled).toEqual({ index: 0, original: 1, rerolled: 6 });
    });
});
