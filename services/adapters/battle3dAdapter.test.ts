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

describe('battle3dAdapter — height/baseElevation source of truth', () => {
    it('reads objectHeight and baseElevation from terrain data when present', () => {
        const battle = makeBattle([
            makeTerrain({ id: 'wall', name: 'Wall', objectHeight: 2 }),
            makeTerrain({ id: 'crate', name: 'Container', objectHeight: 1, position: { x: 1, y: 0 } }),
            makeTerrain({ id: 'door', name: 'Door', type: 'Door', objectHeight: 0, isImpassable: false, position: { x: 2, y: 0 } }),
        ]);

        const view = mapBattleTo3D(battle, null, null, [], null);
        const byId = Object.fromEntries(view.terrain.map((t) => [t.id, t]));

        expect(byId.wall.height).toBe(2);
        expect(byId.wall.baseElevation).toBe(0);
        expect(byId.crate.height).toBe(1);
        expect(byId.crate.baseElevation).toBe(0);
        expect(byId.door.height).toBe(0);
        expect(byId.door.baseElevation).toBe(0);
    });

    it('exposes baseElevation for elevated platforms (roofs)', () => {
        const battle = makeBattle([
            makeTerrain({
                id: 'roof',
                name: 'Building Roof',
                type: 'Area',
                isImpassable: false,
                blocksLineOfSight: false,
                baseElevation: 2,
                objectHeight: 0,
            }),
        ]);

        const view = mapBattleTo3D(battle, null, null, [], null);
        expect(view.terrain[0].baseElevation).toBe(2);
        expect(view.terrain[0].height).toBe(0);
        expect(view.terrain[0].type).toBe('Floor'); // roofs render as flat tiles
    });

    it('falls back to legacy name-based height when objectHeight is undefined', () => {
        const battle = makeBattle([
            makeTerrain({ id: 'legacyWall', name: 'Wall' }), // no objectHeight field
        ]);

        const view = mapBattleTo3D(battle, null, null, [], null);
        expect(view.terrain[0].height).toBe(1.6); // legacy world-unit constant
        expect(view.terrain[0].baseElevation).toBe(0);
    });

    it('treats objectHeight=0 as authoritative (not undefined)', () => {
        // objectHeight 0 means "flat" (door, interior floor, landing pad).
        // It must not fall through to the legacy heuristic.
        const battle = makeBattle([
            makeTerrain({ id: 'flat', name: 'Wall', objectHeight: 0 }),
        ]);

        const view = mapBattleTo3D(battle, null, null, [], null);
        expect(view.terrain[0].height).toBe(0);
    });

    it('classifies Interior floors as Floor type regardless of name', () => {
        const battle = makeBattle([
            makeTerrain({ id: 'i1', name: 'Building A Interior', type: 'Interior', isImpassable: false, blocksLineOfSight: false, objectHeight: 0 }),
        ]);

        const view = mapBattleTo3D(battle, null, null, [], null);
        expect(view.terrain[0].type).toBe('Floor');
    });
});
