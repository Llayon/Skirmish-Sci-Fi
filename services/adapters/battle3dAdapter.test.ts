import { describe, it, expect } from 'vitest';
import { mapBattleTo3D } from './battle3dAdapter';
import type { Battle, Terrain } from '@/types/battle';

function makeTerrain(overrides: Partial<Terrain>): Terrain {
    return {
        id: 't',
        name: 'Wall',
        type: 'Block',
        position: { x: 0, y: 0 },
        size: { width: 1, height: 1 },
        isDifficult: false,
        providesCover: true,
        blocksLineOfSight: true,
        isImpassable: true,
        ...overrides,
    };
}

function makeBattle(terrain: Terrain[]): Battle {
    return {
        gridSize: { width: 4, height: 4 },
        terrain,
        participants: [],
    } as unknown as Battle;
}

describe('battle3dAdapter — terrain elevation source of truth', () => {
    it('reads elevation from terrain data when present', () => {
        const battle = makeBattle([
            makeTerrain({ id: 'w1', name: 'Wall', elevation: 2 }),
            makeTerrain({ id: 'c1', name: 'Container', elevation: 1, position: { x: 1, y: 0 } }),
            makeTerrain({ id: 'd1', name: 'Door', type: 'Door', elevation: 0, isImpassable: false, position: { x: 2, y: 0 } }),
        ]);

        const view = mapBattleTo3D(battle, null, null, [], null);
        const byId = Object.fromEntries(view.terrain.map((t) => [t.id, t]));

        expect(byId.w1.height).toBe(2);
        expect(byId.c1.height).toBe(1);
        expect(byId.d1.height).toBe(0);
    });

    it('falls back to legacy name-based height when elevation is undefined', () => {
        const battle = makeBattle([
            makeTerrain({ id: 'legacyWall', name: 'Wall' }), // no elevation field
        ]);

        const view = mapBattleTo3D(battle, null, null, [], null);
        // Legacy constant for Wall was 1.6; preserved for pre-elevation fixtures.
        expect(view.terrain[0].height).toBe(1.6);
    });

    it('treats elevation=0 as authoritative (not undefined)', () => {
        // elevation 0 means "flat/ground level" (door, interior floor, landing pad).
        // It must not fall through to the legacy heuristic.
        const battle = makeBattle([
            makeTerrain({ id: 'flat', name: 'Wall', elevation: 0 }),
        ]);

        const view = mapBattleTo3D(battle, null, null, [], null);
        expect(view.terrain[0].height).toBe(0);
    });
});
