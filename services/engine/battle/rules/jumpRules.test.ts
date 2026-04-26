import { describe, it, expect } from 'vitest';
import { findJumpDownTargets, pickSafestJumpDownTarget } from './jumpRules';
import { CURRENT_ENGINE_SCHEMA_VERSION, type EngineBattleState } from '../types';
import { createMinimalBattle, createTestCharacter, createTestEnemy } from '@/tests/fixtures/battleFixtures';
import type { Terrain } from '@/types/battle';

const roofAt = (x: number, y: number, w: number, h: number, baseElevation: number): Terrain => ({
    id: `roof_${x}_${y}_${baseElevation}`,
    name: 'Roof',
    type: 'Area',
    position: { x, y },
    size: { width: w, height: h },
    isDifficult: false,
    providesCover: false,
    blocksLineOfSight: false,
    isImpassable: false,
    baseElevation,
    objectHeight: 0,
});

const wallAt = (x: number, y: number): Terrain => ({
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
    objectHeight: 2,
});

function setup(opts: { actorPos: { x: number; y: number }; terrain: Terrain[]; enemies?: { x: number; y: number }[] }) {
    const actor = createTestCharacter({ id: 'a', position: opts.actorPos });
    const enemies = (opts.enemies ?? []).map((p, i) => createTestEnemy({ id: `e${i}`, position: p }));
    const battle = createMinimalBattle({ participants: [actor, ...enemies], terrain: opts.terrain });
    return { schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, battle, rng: { cursor: 0, seed: 1 } } as EngineBattleState;
}

describe('jumpRules: findJumpDownTargets', () => {
    it('returns empty when actor is on ground', () => {
        const state = setup({ actorPos: { x: 5, y: 5 }, terrain: [] });
        expect(findJumpDownTargets(state, 'a')).toEqual([]);
    });

    it('returns empty when actor is unknown', () => {
        const state = setup({ actorPos: { x: 5, y: 5 }, terrain: [] });
        expect(findJumpDownTargets(state, 'nope')).toEqual([]);
    });

    it('lists adjacent cells with strictly lower figureZ', () => {
        // Roof spans (4..6, 4..6) at z=2; actor at (5,5) on the roof.
        // Cells (4,4)(4,5)(4,6)(5,4)(5,6)(6,4)(6,5)(6,6) — center of roof so all 8 still on roof at z=2 → no drop.
        // Move actor to corner of the roof: (6,6). Adjacent: (5,5)(5,6)(5,7)(6,5)(6,7)(7,5)(7,6)(7,7).
        // Cells inside roof (5,5)(5,6)(6,5) → z=2 = no drop. Outside roof (5,7)(6,7)(7,5)(7,6)(7,7) → z=0, drop=2.
        const state = setup({ actorPos: { x: 6, y: 6 }, terrain: [roofAt(4, 4, 3, 3, 2)] });
        const targets = findJumpDownTargets(state, 'a');
        const positions = targets.map((t) => `${t.to.x},${t.to.y}`).sort();
        expect(positions).toEqual(['5,7', '6,7', '7,5', '7,6', '7,7']);
        targets.forEach((t) => expect(t.drop).toBe(2));
        targets.forEach((t) => expect(t.risksFallDamage).toBe(false));
    });

    it('flags drops at or above threshold as risky', () => {
        const state = setup({ actorPos: { x: 6, y: 6 }, terrain: [roofAt(4, 4, 3, 3, 4)] });
        const targets = findJumpDownTargets(state, 'a');
        targets.forEach((t) => expect(t.risksFallDamage).toBe(true));
    });

    it('skips cells occupied by other active participants', () => {
        const state = setup({
            actorPos: { x: 6, y: 6 },
            terrain: [roofAt(4, 4, 3, 3, 2)],
            enemies: [{ x: 7, y: 7 }],
        });
        const positions = findJumpDownTargets(state, 'a').map((t) => `${t.to.x},${t.to.y}`);
        expect(positions).not.toContain('7,7');
    });

    it('skips impassable cells', () => {
        const state = setup({
            actorPos: { x: 6, y: 6 },
            terrain: [roofAt(4, 4, 3, 3, 2), wallAt(7, 7)],
        });
        const positions = findJumpDownTargets(state, 'a').map((t) => `${t.to.x},${t.to.y}`);
        expect(positions).not.toContain('7,7');
    });

    it('respects grid bounds', () => {
        const actor = createTestCharacter({ id: 'a', position: { x: 0, y: 0 } });
        const battle = createMinimalBattle({
            participants: [actor],
            terrain: [roofAt(0, 0, 1, 1, 2)],
            gridSize: { width: 2, height: 2 },
        });
        const state: EngineBattleState = { schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, battle, rng: { cursor: 0, seed: 1 } };
        const positions = findJumpDownTargets(state, 'a').map((t) => `${t.to.x},${t.to.y}`).sort();
        // Only (1,0)(0,1)(1,1) are in-bounds neighbors and outside the roof.
        expect(positions).toEqual(['0,1', '1,0', '1,1']);
    });
});

describe('jumpRules: pickSafestJumpDownTarget', () => {
    it('returns null on empty input', () => {
        expect(pickSafestJumpDownTarget([])).toBeNull();
    });

    it('picks the candidate with the smallest drop', () => {
        const targets = [
            { to: { x: 1, y: 0 }, drop: 4, risksFallDamage: true },
            { to: { x: 2, y: 0 }, drop: 1, risksFallDamage: false },
            { to: { x: 3, y: 0 }, drop: 2, risksFallDamage: false },
        ];
        expect(pickSafestJumpDownTarget(targets)?.to).toEqual({ x: 2, y: 0 });
    });
});
