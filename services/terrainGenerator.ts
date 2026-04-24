
import { Terrain, Position, TerrainTheme, FeatureType, WorldTrait } from '../types';
import { TERRAIN_THEME_GENERATORS } from '../constants/terrain';
import { SeededRngState, d6, nextFloat } from './engine/rng/rng';

type Rect = { x: number; y: number; width: number; height: number };

/**
 * Mutable cursor over an immutable seeded RNG state. Used inside the
 * generator for ergonomic point-of-use RNG consumption without threading
 * the state through every helper. Call `getState()` at the end to recover
 * the final immutable state for the caller.
 */
type RngCursor = {
    d6: () => 1 | 2 | 3 | 4 | 5 | 6;
    float: () => number;
    getState: () => SeededRngState;
};

function createRngCursor(initial: SeededRngState): RngCursor {
    let state: SeededRngState = initial;
    return {
        d6: () => {
            const r = d6(state);
            state = r.next as SeededRngState;
            return r.value;
        },
        float: () => {
            const r = nextFloat(state);
            state = r.next;
            return r.value;
        },
        getState: () => state,
    };
}

let terrainIdCounter = 0;

function isAreaOccupied(pos: Position, size: { width: number; height: number }, existingTerrain: Terrain[]): boolean {
  const itemRect = { x: pos.x, y: pos.y, width: size.width, height: size.height };
  for (const t of existingTerrain) {
    const terrainRect = { x: t.position.x, y: t.position.y, width: t.size.width, height: t.size.height };
    if (
      itemRect.x < terrainRect.x + terrainRect.width &&
      itemRect.x + itemRect.width > terrainRect.x &&
      itemRect.y < terrainRect.y + terrainRect.height &&
      itemRect.y + itemRect.height > terrainRect.y
    ) {
      return true; // Overlap found
    }
  }
  return false;
}

function findFreeSpot(rect: Rect, itemSize: { width: number; height: number }, existingTerrain: Terrain[], rng: RngCursor): Position | null {
    for (let i = 0; i < 50; i++) { // Try 50 times to find a spot
        if (rect.width < itemSize.width || rect.height < itemSize.height) return null;
        const pos = {
            x: rect.x + Math.floor(rng.float() * (rect.width - itemSize.width + 1)),
            y: rect.y + Math.floor(rng.float() * (rect.height - itemSize.height + 1)),
        };
        if (!isAreaOccupied(pos, itemSize, existingTerrain)) {
            return pos;
        }
    }
    return null; // Could not find a free spot
}

function createTerrain(
    name: string,
    type: Terrain['type'],
    pos: Position,
    size: {width: number, height: number},
    options: Partial<Pick<Terrain, 'isDifficult' | 'providesCover' | 'blocksLineOfSight' | 'isImpassable' | 'isInteractive' | 'parentId'>> = {}
): Terrain {
    return {
        id: `terrain_${terrainIdCounter++}`,
        name,
        type,
        position: pos,
        size,
        isDifficult: options.isDifficult ?? false,
        providesCover: options.providesCover ?? false,
        blocksLineOfSight: options.blocksLineOfSight ?? false,
        isImpassable: options.isImpassable ?? false,
        isInteractive: options.isInteractive ?? false,
        parentId: options.parentId,
    };
}

function createBuilding(
    name: string,
    pos: Position,
    size: {width: number, height: number},
    rng: RngCursor
): Terrain[] {
    const buildingTerrain: Terrain[] = [];
    const buildingId = `building_${terrainIdCounter++}`;

    // Buildings must be at least 3x3 to have an interior
    if (size.width < 3 || size.height < 3) {
        return [createTerrain(name, 'Block', pos, size, { providesCover: true, blocksLineOfSight: true, isImpassable: true })];
    }

    // Create walls as individual impassable blocks
    const wallOptions = { providesCover: true, blocksLineOfSight: true, isImpassable: true, parentId: buildingId };
    for (let y = pos.y; y < pos.y + size.height; y++) {
        for (let x = pos.x; x < pos.x + size.width; x++) {
            if (x === pos.x || x === pos.x + size.width - 1 || y === pos.y || y === pos.y + size.height - 1) {
                buildingTerrain.push(createTerrain('Wall', 'Block', { x, y }, { width: 1, height: 1 }, wallOptions));
            }
        }
    }

    // Create Interior - does not block LOS for units inside the same building
    buildingTerrain.push(createTerrain(
        `${name} Interior`, 'Interior',
        { x: pos.x + 1, y: pos.y + 1 },
        { width: size.width - 2, height: size.height - 2 },
        { blocksLineOfSight: false, parentId: buildingId }
    ));

    // Create a door
    const side = Math.floor(rng.float() * 4); // 0: top, 1: bottom, 2: left, 3: right
    let doorPos: Position;
    switch (side) {
        case 0: // top
            doorPos = { x: pos.x + 1 + Math.floor(rng.float() * (size.width - 2)), y: pos.y };
            break;
        case 1: // bottom
            doorPos = { x: pos.x + 1 + Math.floor(rng.float() * (size.width - 2)), y: pos.y + size.height - 1 };
            break;
        case 2: // left
            doorPos = { x: pos.x, y: pos.y + 1 + Math.floor(rng.float() * (size.height - 2)) };
            break;
        case 3: // right
        default:
            doorPos = { x: pos.x + size.width - 1, y: pos.y + 1 + Math.floor(rng.float() * (size.height - 2)) };
            break;
    }

    // Replace wall with a door
    const wallIndex = buildingTerrain.findIndex(t => t.position.x === doorPos.x && t.position.y === doorPos.y);
    if (wallIndex !== -1) {
        buildingTerrain.splice(wallIndex, 1);
    }

    // A door is passable, provides cover, and blocks LOS unless you are next to it.
    buildingTerrain.push(createTerrain(
        'Door', 'Door', doorPos, { width: 1, height: 1 },
        { isImpassable: false, providesCover: true, blocksLineOfSight: true, isInteractive: true, parentId: buildingId }
    ));

    return buildingTerrain;
}


type FeatureGenerator = (rect: Rect, existing: Terrain[], rng: RngCursor) => Terrain[];

const featureGenerators: Record<FeatureType, FeatureGenerator> = (() => {
    const generators: Partial<Record<FeatureType, FeatureGenerator>> = {
        // --- Shared ---
        scatter: (rect, existing, rng) => {
            const terrain: Terrain[] = [];
            const size = { width: 1, height: 1 };
            const pos = findFreeSpot(rect, size, existing, rng);
            if (pos) terrain.push(createTerrain('Scatter', 'Individual', pos, size, { providesCover: true, blocksLineOfSight: false }));
            return terrain;
        },
        hill: (rect, existing, rng) => {
            const size = { width: rng.d6() + 4, height: rng.d6() + 4 };
            const pos = findFreeSpot(rect, size, existing, rng);
            if (!pos) return [];
            return [createTerrain('Hill', 'Area', pos, size, { providesCover: true, isDifficult: true, blocksLineOfSight: false })];
        },
        // --- Industrial ---
        large_structure: (rect, existing, rng) => {
            const size = { width: rng.d6() + 4, height: rng.d6() + 4 };
            const pos = findFreeSpot(rect, size, existing, rng);
            if (!pos) return [];
            return createBuilding('Large Structure', pos, size, rng);
        },
        industrial_cluster: (rect, existing, rng) => {
            const terrain: Terrain[] = [];
            const towerSize = { width: rng.d6() + 1, height: rng.d6() + 1 };
            const towerPos = findFreeSpot(rect, towerSize, existing, rng);

            if (towerPos) {
                // Create the central block
                terrain.push(...createBuilding('Control Tower', towerPos, towerSize, rng));

                // Create surrounding individual equipment pieces
                const equipmentCount = rng.d6();
                for (let i = 0; i < equipmentCount; i++) {
                    const eqSize = { width: 1, height: 1 };
                    const eqPos = findFreeSpot(rect, eqSize, [...existing, ...terrain], rng);
                    if (eqPos) {
                         terrain.push(createTerrain('Equipment', 'Individual', eqPos, eqSize, { providesCover: true, blocksLineOfSight: false }));
                    }
                }
            }
            return terrain;
        },
        fenced_area: (rect, existing, rng) => {
            const terrain: Terrain[] = [];
            const areaSize = { width: Math.min(12, rect.width - 2), height: Math.min(12, rect.height - 2) };
            const areaPos = findFreeSpot(rect, areaSize, existing, rng);
            if (!areaPos) return [];
            // Create linear fence pieces. They provide cover and block LOS, but are not impassable.
            const fenceOptions = { providesCover: true, blocksLineOfSight: true, isImpassable: false };
            terrain.push(createTerrain('Fence Post', 'Linear', { x: areaPos.x, y: areaPos.y }, { width: areaSize.width, height: 1 }, fenceOptions));
            terrain.push(createTerrain('Fence Post', 'Linear', { x: areaPos.x, y: areaPos.y + areaSize.height - 1 }, { width: areaSize.width, height: 1 }, fenceOptions));
            terrain.push(createTerrain('Fence Post', 'Linear', { x: areaPos.x, y: areaPos.y }, { width: 1, height: areaSize.height }, fenceOptions));
            terrain.push(createTerrain('Fence Post', 'Linear', { x: areaPos.x + areaSize.width - 1, y: areaPos.y }, { width: 1, height: areaSize.height }, fenceOptions));
            return terrain;
        },
        landing_pad: (rect, existing, rng) => {
            const size = { width: 10, height: 10 };
            const pos = findFreeSpot(rect, size, existing, rng);
            if(!pos) return [];
            return [createTerrain('Landing Pad', 'Area', pos, size, { providesCover: false, blocksLineOfSight: false })];
        },
        cargo_area: (rect, existing, rng) => {
            const terrain: Terrain[] = [];
            const count = rng.d6() + 2;
            for (let i = 0; i < count; i++) {
                const size = { width: rng.d6() + 1, height: rng.d6() };
                const pos = findFreeSpot(rect, size, [...existing, ...terrain], rng);
                if (pos) terrain.push(createTerrain('Container', 'Block', pos, size, { providesCover: true, blocksLineOfSight: true, isImpassable: true }));
            }
            return terrain;
        },
        two_structures: (rect, existing, rng) => {
            const t: Terrain[] = [];
            const size1 = { width: rng.d6() + 2, height: rng.d6() + 2 };
            const pos1 = findFreeSpot(rect, size1, existing, rng);
            if (pos1) {
                t.push(...createBuilding('Building A', pos1, size1, rng));
            }

            const size2 = { width: rng.d6() + 2, height: rng.d6() + 2 };
            const pos2 = findFreeSpot(rect, size2, [...existing, ...t], rng);
            if (pos2) {
                t.push(...createBuilding('Building B', pos2, size2, rng));
            }
            return t;
        },
        linear_obstacle: (rect, existing, rng) => {
            const len = rng.d6() + 4;
            const size = rng.float() > 0.5 ? { width: len, height: 1 } : { width: 1, height: len };
            const pos = findFreeSpot(rect, size, existing, rng);
            if (!pos) return [];
            return [createTerrain('Barricade', 'Linear', pos, size, { providesCover: true, blocksLineOfSight: true, isImpassable: false })];
        },
        building: (rect, existing, rng) => {
            const size = { width: rng.d6() + 3, height: rng.d6() + 3 };
            const pos = findFreeSpot(rect, size, existing, rng);
            if (!pos) return [];
            return createBuilding('Building', pos, size, rng);
        },
        industrial_rubble: (rect, existing, rng) => {
            const size = { width: rng.d6() + 3, height: rng.d6() + 3 };
            const pos = findFreeSpot(rect, size, existing, rng);
            if (!pos) return [];
            return [createTerrain('Rubble', 'Area', pos, size, { isDifficult: true, providesCover: true, blocksLineOfSight: false })];
        },
        spread_scatter: (rect, existing, rng) => {
            const terrain: Terrain[] = [];
            const count = rng.d6() + 2;
            for (let i = 0; i < count; i++) {
                const size = { width: rng.d6() > 3 ? 2 : 1, height: rng.d6() > 3 ? 2 : 1 };
                const pos = findFreeSpot(rect, size, [...existing, ...terrain], rng);
                if (pos) terrain.push(createTerrain('Barrel', 'Individual', pos, size, { providesCover: true, blocksLineOfSight: false }));
            }
            return terrain;
        },
        open_ground_central: (rect, existing, rng) => {
            const size = { width: 2, height: 2 };
            const pos = findFreeSpot(rect, size, existing, rng);
            if (!pos) return [];
            return [createTerrain('Statue', 'Individual', pos, size, { providesCover: true, blocksLineOfSight: false })];
        },
        industrial_urban_scatter: (rect, existing, rng) => {
            const size = { width: 4, height: 2 };
            const pos = findFreeSpot(rect, size, existing, rng);
            if (!pos) return [];
            return [createTerrain('Vehicle', 'Block', pos, size, { providesCover: true, blocksLineOfSight: true, isImpassable: true })];
        },
        // --- Wilderness ---
        large_swamp: (rect, existing, rng) => {
            const size = { width: rng.d6() + 6, height: rng.d6() + 6 };
            const pos = findFreeSpot(rect, size, existing, rng);
            if (!pos) return [];
            // A swamp is a Field that is difficult, but doesn't provide cover or block LOS
            return [createTerrain('Swamp', 'Field', pos, size, { isDifficult: true, providesCover: false, blocksLineOfSight: false })];
        },
        natural_linear: (rect, existing, rng) => {
            const len = rng.d6() + 4;
            const size = rng.float() > 0.5 ? { width: len, height: 1 } : { width: 1, height: len };
            const pos = findFreeSpot(rect, size, existing, rng);
            if (!pos) return [];
            return [createTerrain('Rock Ridge', 'Linear', pos, size, { providesCover: true, blocksLineOfSight: true, isImpassable: false })];
        },
        // --- Alien Ruin ---
        ruined_wall: (rect, existing, rng) => {
            const len = rng.d6() + 6;
            const size = rng.float() > 0.5 ? { width: len, height: 1 } : { width: 1, height: len };
            const pos = findFreeSpot(rect, size, existing, rng);
            if (!pos) return [];
            return [createTerrain('Ruined Wall', 'Linear', pos, size, { providesCover: true, blocksLineOfSight: true, isImpassable: false })];
        },
        // --- Crash Site ---
        wreckage_line: (rect, existing, rng) => {
            const len = rng.d6() + 6;
            const size = rng.float() > 0.5 ? { width: len, height: 1 } : { width: 1, height: len };
            const pos = findFreeSpot(rect, size, existing, rng);
            if (!pos) return [];
            return [createTerrain('Wreckage Line', 'Linear', pos, size, { providesCover: true, blocksLineOfSight: true, isImpassable: false })];
        },
    };

    const allFeatures: FeatureType[] = Object.values(TERRAIN_THEME_GENERATORS).flatMap(g => [...g.notableFeatures, ...g.regularFeatures]);
    for (const feature of allFeatures) {
        if (!generators[feature]) {
            generators[feature] = (rect, existing, rng) => {
                 const size = { width: rng.d6() + 1, height: rng.d6() + 1 };
                 const pos = findFreeSpot(rect, size, existing, rng);
                 if (!pos) return [];
                 const name = feature.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                 if (['building', 'structure', 'ruin'].some(keyword => name.toLowerCase().includes(keyword))) {
                    return createBuilding(name, pos, size, rng);
                 }
                 return [createTerrain(name, 'Individual', pos, size, { providesCover: true, blocksLineOfSight: false })];
            }
        }
    }
    return generators as Record<FeatureType, FeatureGenerator>;
})();


export const generateTerrain = (
    theme: TerrainTheme,
    gridSize: { width: number; height: number },
    worldTraits: WorldTrait[] = [],
    rngState: SeededRngState,
): { terrain: Terrain[]; rng: SeededRngState } => {
    terrainIdCounter = 0;
    const rng = createRngCursor(rngState);
    const terrain: Terrain[] = [];
    const themeGenerator = TERRAIN_THEME_GENERATORS[theme];

    // Step 1: Define Quarters
    const halfW = Math.floor(gridSize.width / 2);
    const halfH = Math.floor(gridSize.height / 2);
    const quarters = [
        { x: 0, y: 0, width: halfW, height: halfH }, // top-left
        { x: halfW, y: 0, width: gridSize.width - halfW, height: halfH }, // top-right
        { x: 0, y: halfH, width: halfW, height: gridSize.height - halfH }, // bottom-left
        { x: halfW, y: halfH, width: gridSize.width - halfW, height: gridSize.height - halfH }, // bottom-right
    ];
    const centerRect: Rect = { x: halfW - 4, y: halfH - 4, width: 8, height: 8 };

    // Step 2: The Center Notable Feature
    const notableRoll = rng.d6();
    const notableFeatureType = themeGenerator.notableFeatures[notableRoll - 1];
    const notableGen = featureGenerators[notableFeatureType];
    if (notableGen) {
        terrain.push(...notableGen(centerRect, terrain, rng));
    }

    // Step 3 & 4: Quarters and Scatter
    for (const quarter of quarters) {
        // Regular Features
        const featuresToPlace = [rng.d6(), rng.d6(), rng.d6(), rng.d6()].map(roll => themeGenerator.regularFeatures[roll - 1]);

        const sectorW = Math.floor(quarter.width / 2);
        const sectorH = Math.floor(quarter.height / 2);
        const sectors = [
            { x: quarter.x, y: quarter.y, width: sectorW, height: sectorH },
            { x: quarter.x + sectorW, y: quarter.y, width: quarter.width - sectorW, height: sectorH },
            { x: quarter.x, y: quarter.y + sectorH, width: sectorW, height: quarter.height - sectorH },
            { x: quarter.x + sectorW, y: quarter.y + sectorH, width: quarter.width - sectorW, height: quarter.height - sectorH },
        ];

        featuresToPlace.forEach((featureType, i) => {
            const generator = featureGenerators[featureType];
            if(generator) {
                // Place feature somewhere in the quarter, trying to put it in its sector
                const newPieces = generator(sectors[i], terrain, rng);
                terrain.push(...newPieces);
            }
        });

        // Scatter
        const scatterCount = rng.d6();
        for (let i = 0; i < scatterCount; i++) {
            const scatterPieces = featureGenerators.scatter(quarter, terrain, rng);
            terrain.push(...scatterPieces);
        }
    }

    // Add Crystals for world trait
    if (worldTraits.some(t => t.id === 'crystals')) {
        const crystalCount = rng.d6() + rng.d6();
        const rect = { x: 0, y: 0, width: gridSize.width, height: gridSize.height };
        for (let i = 0; i < crystalCount; i++) {
            const size = { width: 1, height: 1 };
            const pos = findFreeSpot(rect, size, terrain, rng);
            if (pos) {
                terrain.push(createTerrain('Crystal', 'Individual', pos, size, { providesCover: true, blocksLineOfSight: false }));
            }
        }
    }

    return { terrain, rng: rng.getState() };
}
