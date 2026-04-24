import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Terrain, TerrainTheme } from '@/types';

// Mock the rolls module before importing the generator so the spy binds cleanly.
vi.mock('@/services/utils/rolls', () => ({
    rollD6: vi.fn(),
    rollD10: vi.fn(),
    rollD100: vi.fn(),
}));

import { rollD6 } from '@/services/utils/rolls';
import { generateTerrain } from '@/services/terrainGenerator';

// Mulberry32-equivalent float source, matching services/engine/rng/rng.ts::nextFloat.
// Using the same algorithm here means a future V2 generator fed `createScriptedRngState`
// (or a seeded RNG) derived from the same seed will emit an identical float sequence,
// and therefore produce the same terrain layout — that is the parity bridge.
function createSeededFloatSource(seed: number): () => number {
    let cursor = 0;
    return () => {
        const input = ((seed ^ 0xdeadbeef) + Math.imul(cursor, 0x9e3779b9)) | 0;
        cursor += 1;
        let t = (input + 0x6d2b79f5) | 0;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function installDeterministicRng(seed: number): () => number {
    const floatSource = createSeededFloatSource(seed);
    vi.mocked(rollD6).mockImplementation(() => Math.floor(floatSource() * 6) + 1);
    vi.spyOn(Math, 'random').mockImplementation(() => floatSource());
    return floatSource;
}

// Strip runtime-assigned ids so structural comparisons are stable across runs.
function stripIds(terrain: Terrain[]): Omit<Terrain, 'id' | 'parentId'>[] {
    return terrain.map((t) => {
        const copy: Partial<Terrain> = { ...t };
        delete copy.id;
        delete copy.parentId;
        return copy as Omit<Terrain, 'id' | 'parentId'>;
    });
}

describe('Parity: Terrain Generation (V1 Baseline for V2 Migration)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Determinism — same seed produces identical terrain', () => {
        const themes: TerrainTheme[] = ['Industrial', 'Wilderness', 'AlienRuin', 'CrashSite'];
        const gridSize = { width: 32, height: 32 };

        themes.forEach((theme) => {
            it(`[${theme}] two runs with seed=12345 produce the same layout`, () => {
                installDeterministicRng(12345);
                const first = generateTerrain(theme, gridSize, []);

                installDeterministicRng(12345);
                const second = generateTerrain(theme, gridSize, []);

                expect(stripIds(first)).toEqual(stripIds(second));
            });
        });

        it('different seeds produce different layouts', () => {
            installDeterministicRng(1);
            const a = generateTerrain('Industrial', gridSize, []);

            installDeterministicRng(2);
            const b = generateTerrain('Industrial', gridSize, []);

            expect(stripIds(a)).not.toEqual(stripIds(b));
        });
    });

    describe('Structural invariants', () => {
        const gridSize = { width: 32, height: 32 };

        it('every terrain piece is fully inside the grid', () => {
            installDeterministicRng(7777);
            const terrain = generateTerrain('Industrial', gridSize, []);

            expect(terrain.length).toBeGreaterThan(0);
            for (const t of terrain) {
                expect(t.position.x).toBeGreaterThanOrEqual(0);
                expect(t.position.y).toBeGreaterThanOrEqual(0);
                expect(t.position.x + t.size.width).toBeLessThanOrEqual(gridSize.width);
                expect(t.position.y + t.size.height).toBeLessThanOrEqual(gridSize.height);
                expect(t.size.width).toBeGreaterThan(0);
                expect(t.size.height).toBeGreaterThan(0);
            }
        });

        it('world trait "crystals" adds Crystal terrain pieces', () => {
            installDeterministicRng(4242);
            const withTrait = generateTerrain('Wilderness', gridSize, [
                { id: 'crystals', name: 'Crystals', description: '' } as unknown as Parameters<typeof generateTerrain>[2][number],
            ]);
            const crystalCount = withTrait.filter((t) => t.name === 'Crystal').length;
            expect(crystalCount).toBeGreaterThan(0);
        });
    });

    describe('Golden baseline — captures current V1 output for future V2 parity', () => {
        const gridSize = { width: 32, height: 32 };

        // These snapshots freeze V1 behavior for a known RNG seed. When the V2
        // terrain-generation action lands, it must reproduce exactly the same
        // layout when seeded equivalently — these assertions become the parity gate.
        const themes: TerrainTheme[] = ['Industrial', 'Wilderness', 'AlienRuin', 'CrashSite'];

        themes.forEach((theme) => {
            it(`[${theme}] terrain signature at seed=12345 matches snapshot`, () => {
                installDeterministicRng(12345);
                const terrain = generateTerrain(theme, gridSize, []);

                const signature = {
                    count: terrain.length,
                    pieces: stripIds(terrain).map((t) => ({
                        name: t.name,
                        type: t.type,
                        x: t.position.x,
                        y: t.position.y,
                        w: t.size.width,
                        h: t.size.height,
                        isDifficult: t.isDifficult,
                        providesCover: t.providesCover,
                        blocksLineOfSight: t.blocksLineOfSight,
                        isImpassable: t.isImpassable,
                    })),
                };

                expect(signature).toMatchSnapshot();
            });
        });
    });
});
