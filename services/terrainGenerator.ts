
import { Terrain, Position, TerrainTheme, FeatureType, WorldTrait } from '../types';
import { TERRAIN_THEME_GENERATORS } from '../constants/terrain';
import { SeededRngState, d6, nextFloat } from './engine/rng/rng';

type Rect = { x: number; y: number; width: number; height: number };

/**
 * Mutable cursor over an immutable seeded RNG state plus a per-call id
 * counter. Used inside the generator for ergonomic point-of-use RNG
 * consumption without threading state through every helper. Call
 * `getState()` at the end to recover the final immutable RNG state for
 * the caller. The id counter is local to the cursor — no module-level
 * mutable state, so concurrent or sequential generations don't collide
 * and a future replay can reproduce IDs deterministically.
 */
type GenCursor = {
    d6: () => 1 | 2 | 3 | 4 | 5 | 6;
    float: () => number;
    nextId: () => number;
    getState: () => SeededRngState;
};

function createGenCursor(initial: SeededRngState): GenCursor {
    let state: SeededRngState = initial;
    let idCounter = 0;
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
        nextId: () => idCounter++,
        getState: () => state,
    };
}

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

function findFreeSpot(rect: Rect, itemSize: { width: number; height: number }, existingTerrain: Terrain[], rng: GenCursor): Position | null {
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
    rng: GenCursor,
    name: string,
    type: Terrain['type'],
    pos: Position,
    size: {width: number, height: number},
    options: Partial<Pick<Terrain, 'isDifficult' | 'providesCover' | 'blocksLineOfSight' | 'isImpassable' | 'isInteractive' | 'parentId' | 'baseElevation' | 'objectHeight' | 'losBlockerHeight'>> = {}
): Terrain {
    return {
        id: `terrain_${rng.nextId()}`,
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
        baseElevation: options.baseElevation ?? 0,
        objectHeight: options.objectHeight ?? 0,
        ...(options.losBlockerHeight != null ? { losBlockerHeight: options.losBlockerHeight } : {}),
    };
}

function createBuilding(
    name: string,
    pos: Position,
    size: {width: number, height: number},
    rng: GenCursor
): Terrain[] {
    const buildingTerrain: Terrain[] = [];
    const buildingId = `building_${rng.nextId()}`;

    // Buildings must be at least 3x3 to have an interior
    if (size.width < 3 || size.height < 3) {
        // Solid block too small for an interior — treat as a 2-unit wall mass.
        return [createTerrain(rng, name, 'Block', pos, size, { providesCover: true, blocksLineOfSight: true, isImpassable: true, objectHeight: 2 })];
    }

    // Create walls as individual impassable blocks. Walls are 2 units tall
    // (rulebook: waist-to-shoulder height, blocks LoS for standing figures).
    const wallOptions = { providesCover: true, blocksLineOfSight: true, isImpassable: true, parentId: buildingId, objectHeight: 2 };
    for (let y = pos.y; y < pos.y + size.height; y++) {
        for (let x = pos.x; x < pos.x + size.width; x++) {
            if (x === pos.x || x === pos.x + size.width - 1 || y === pos.y || y === pos.y + size.height - 1) {
                buildingTerrain.push(createTerrain(rng, 'Wall', 'Block', { x, y }, { width: 1, height: 1 }, wallOptions));
            }
        }
    }

    // Interior floor sits at ground level — figures inside stand on it at elevation 0.
    buildingTerrain.push(createTerrain(
        rng,
        `${name} Interior`, 'Interior',
        { x: pos.x + 1, y: pos.y + 1 },
        { width: size.width - 2, height: size.height - 2 },
        { blocksLineOfSight: false, parentId: buildingId, objectHeight: 0 }
    ));

    // Roof covers the interior footprint as a flat platform at
    // baseElevation 2 — reachable by climbing an adjacent wall (rulebook:
    // Moving Up and Down). objectHeight is 0 because the roof itself has
    // no thickness for Cover/LoS purposes. A figure on the roof stands
    // above surrounding waist-high cover and gains Height Advantage for
    // Good Shot purposes against ground-level targets.
    buildingTerrain.push(createTerrain(
        rng,
        `${name} Roof`, 'Area',
        { x: pos.x + 1, y: pos.y + 1 },
        { width: size.width - 2, height: size.height - 2 },
        { blocksLineOfSight: false, providesCover: false, isImpassable: false, parentId: buildingId, baseElevation: 2, objectHeight: 0 }
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

    // A door is passable at ground level — figures walk through at floor
    // level (objectHeight: 0). When closed, it is opaque to LoS for
    // standing figures: losBlockerHeight: 2 captures that without giving
    // the door physical thickness for movement.
    buildingTerrain.push(createTerrain(
        rng,
        'Door', 'Door', doorPos, { width: 1, height: 1 },
        { isImpassable: false, providesCover: true, blocksLineOfSight: true, isInteractive: true, parentId: buildingId, objectHeight: 0, losBlockerHeight: 2 }
    ));

    return buildingTerrain;
}


type FeatureGenerator = (rect: Rect, existing: Terrain[], rng: GenCursor) => Terrain[];

const featureGenerators: Record<FeatureType, FeatureGenerator> = (() => {
    const generators: Partial<Record<FeatureType, FeatureGenerator>> = {
        // --- Shared ---
        scatter: (rect, existing, rng) => {
            const terrain: Terrain[] = [];
            const size = { width: 1, height: 1 };
            const pos = findFreeSpot(rect, size, existing, rng);
            if (pos) terrain.push(createTerrain(rng, 'Scatter', 'Individual', pos, size, { providesCover: true, blocksLineOfSight: false, objectHeight: 1 }));
            return terrain;
        },
        hill: (rect, existing, rng) => {
            const size = { width: rng.d6() + 4, height: rng.d6() + 4 };
            const pos = findFreeSpot(rect, size, existing, rng);
            if (!pos) return [];
            return [createTerrain(rng, 'Hill', 'Area', pos, size, { providesCover: true, isDifficult: true, blocksLineOfSight: false, objectHeight: 1 })];
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
                         terrain.push(createTerrain(rng, 'Equipment', 'Individual', eqPos, eqSize, { providesCover: true, blocksLineOfSight: false, objectHeight: 1 }));
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
            // Fences are waist-high (1 unit) — a standing figure sees over but ducking behind gets cover.
            const fenceOptions = { providesCover: true, blocksLineOfSight: true, isImpassable: false, objectHeight: 1 };
            terrain.push(createTerrain(rng, 'Fence Post', 'Linear', { x: areaPos.x, y: areaPos.y }, { width: areaSize.width, height: 1 }, fenceOptions));
            terrain.push(createTerrain(rng, 'Fence Post', 'Linear', { x: areaPos.x, y: areaPos.y + areaSize.height - 1 }, { width: areaSize.width, height: 1 }, fenceOptions));
            terrain.push(createTerrain(rng, 'Fence Post', 'Linear', { x: areaPos.x, y: areaPos.y }, { width: 1, height: areaSize.height }, fenceOptions));
            terrain.push(createTerrain(rng, 'Fence Post', 'Linear', { x: areaPos.x + areaSize.width - 1, y: areaPos.y }, { width: 1, height: areaSize.height }, fenceOptions));
            return terrain;
        },
        landing_pad: (rect, existing, rng) => {
            const size = { width: 10, height: 10 };
            const pos = findFreeSpot(rect, size, existing, rng);
            if(!pos) return [];
            return [createTerrain(rng, 'Landing Pad', 'Area', pos, size, { providesCover: false, blocksLineOfSight: false, objectHeight: 0 })];
        },
        cargo_area: (rect, existing, rng) => {
            const terrain: Terrain[] = [];
            const count = rng.d6() + 2;
            for (let i = 0; i < count; i++) {
                const size = { width: rng.d6() + 1, height: rng.d6() };
                const pos = findFreeSpot(rect, size, [...existing, ...terrain], rng);
                if (pos) terrain.push(createTerrain(rng, 'Container', 'Block', pos, size, { providesCover: true, blocksLineOfSight: true, isImpassable: true, objectHeight: 1 }));
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
            return [createTerrain(rng, 'Barricade', 'Linear', pos, size, { providesCover: true, blocksLineOfSight: true, isImpassable: false, objectHeight: 1 })];
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
            return [createTerrain(rng, 'Rubble', 'Area', pos, size, { isDifficult: true, providesCover: true, blocksLineOfSight: false, objectHeight: 1 })];
        },
        spread_scatter: (rect, existing, rng) => {
            const terrain: Terrain[] = [];
            const count = rng.d6() + 2;
            for (let i = 0; i < count; i++) {
                const size = { width: rng.d6() > 3 ? 2 : 1, height: rng.d6() > 3 ? 2 : 1 };
                const pos = findFreeSpot(rect, size, [...existing, ...terrain], rng);
                if (pos) terrain.push(createTerrain(rng, 'Barrel', 'Individual', pos, size, { providesCover: true, blocksLineOfSight: false, objectHeight: 1 }));
            }
            return terrain;
        },
        open_ground_central: (rect, existing, rng) => {
            const size = { width: 2, height: 2 };
            const pos = findFreeSpot(rect, size, existing, rng);
            if (!pos) return [];
            return [createTerrain(rng, 'Statue', 'Individual', pos, size, { providesCover: true, blocksLineOfSight: false, objectHeight: 2 })];
        },
        industrial_urban_scatter: (rect, existing, rng) => {
            const size = { width: 4, height: 2 };
            const pos = findFreeSpot(rect, size, existing, rng);
            if (!pos) return [];
            return [createTerrain(rng, 'Vehicle', 'Block', pos, size, { providesCover: true, blocksLineOfSight: true, isImpassable: true, objectHeight: 1 })];
        },
        // --- Wilderness ---
        large_swamp: (rect, existing, rng) => {
            const size = { width: rng.d6() + 6, height: rng.d6() + 6 };
            const pos = findFreeSpot(rect, size, existing, rng);
            if (!pos) return [];
            // A swamp is a Field that is difficult, but doesn't provide cover or block LOS
            return [createTerrain(rng, 'Swamp', 'Field', pos, size, { isDifficult: true, providesCover: false, blocksLineOfSight: false, objectHeight: 0 })];
        },
        natural_linear: (rect, existing, rng) => {
            const len = rng.d6() + 4;
            const size = rng.float() > 0.5 ? { width: len, height: 1 } : { width: 1, height: len };
            const pos = findFreeSpot(rect, size, existing, rng);
            if (!pos) return [];
            return [createTerrain(rng, 'Rock Ridge', 'Linear', pos, size, { providesCover: true, blocksLineOfSight: true, isImpassable: false, objectHeight: 1 })];
        },
        // --- Alien Ruin ---
        ruined_wall: (rect, existing, rng) => {
            const len = rng.d6() + 6;
            const size = rng.float() > 0.5 ? { width: len, height: 1 } : { width: 1, height: len };
            const pos = findFreeSpot(rect, size, existing, rng);
            if (!pos) return [];
            return [createTerrain(rng, 'Ruined Wall', 'Linear', pos, size, { providesCover: true, blocksLineOfSight: true, isImpassable: false, objectHeight: 2 })];
        },
        // --- Crash Site ---
        wreckage_line: (rect, existing, rng) => {
            const len = rng.d6() + 6;
            const size = rng.float() > 0.5 ? { width: len, height: 1 } : { width: 1, height: len };
            const pos = findFreeSpot(rect, size, existing, rng);
            if (!pos) return [];
            return [createTerrain(rng, 'Wreckage Line', 'Linear', pos, size, { providesCover: true, blocksLineOfSight: true, isImpassable: false, objectHeight: 1 })];
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
                 return [createTerrain(rng, name, 'Individual', pos, size, { providesCover: true, blocksLineOfSight: false, objectHeight: 1 })];
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
    const rng = createGenCursor(rngState);
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
                terrain.push(createTerrain(rng, 'Crystal', 'Individual', pos, size, { providesCover: true, blocksLineOfSight: false, objectHeight: 1 }));
            }
        }
    }

    return { terrain, rng: rng.getState() };
}
