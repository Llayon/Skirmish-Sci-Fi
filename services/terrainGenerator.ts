import {
  Terrain,
  Position,
  TerrainTheme,
  FeatureType,
  WorldTrait,
  TacticalZoneSpec,
  TacticalAnchorType,
  PlacedAnchor,
} from "../types";
import {
  TERRAIN_THEME_GENERATORS,
  TerrainGeneratorSchema,
} from "../constants/terrain";
import { SeededRngState, d6, nextFloat } from "./engine/rng/rng";

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

function isAreaOccupied(
  pos: Position,
  size: { width: number; height: number },
  existingTerrain: Terrain[],
): boolean {
  const itemRect = {
    x: pos.x,
    y: pos.y,
    width: size.width,
    height: size.height,
  };
  for (const t of existingTerrain) {
    const terrainRect = {
      x: t.position.x,
      y: t.position.y,
      width: t.size.width,
      height: t.size.height,
    };
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

function findFreeSpot(
  rect: Rect,
  itemSize: { width: number; height: number },
  existingTerrain: Terrain[],
  rng: GenCursor,
): Position | null {
  for (let i = 0; i < 50; i++) {
    // Try 50 times to find a spot
    if (rect.width < itemSize.width || rect.height < itemSize.height)
      return null;
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
  type: Terrain["type"],
  pos: Position,
  size: { width: number; height: number },
  options: Partial<
    Pick<
      Terrain,
      | "isDifficult"
      | "providesCover"
      | "blocksLineOfSight"
      | "isImpassable"
      | "isInteractive"
      | "parentId"
      | "baseElevation"
      | "objectHeight"
      | "losBlockerHeight"
    >
  > = {},
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
    ...(options.losBlockerHeight != null
      ? { losBlockerHeight: options.losBlockerHeight }
      : {}),
  };
}

function createBuilding(
  name: string,
  pos: Position,
  size: { width: number; height: number },
  rng: GenCursor,
): Terrain[] {
  const buildingTerrain: Terrain[] = [];
  const buildingId = `building_${rng.nextId()}`;

  // Buildings must be at least 3x3 to have an interior
  if (size.width < 3 || size.height < 3) {
    // Solid block too small for an interior — treat as a 2-unit wall mass.
    return [
      createTerrain(rng, name, "Block", pos, size, {
        providesCover: true,
        blocksLineOfSight: true,
        isImpassable: true,
        objectHeight: 2,
      }),
    ];
  }

  // Create walls as individual impassable blocks. Walls are 2 units tall
  // (rulebook: waist-to-shoulder height, blocks LoS for standing figures).
  const wallOptions = {
    providesCover: true,
    blocksLineOfSight: true,
    isImpassable: true,
    parentId: buildingId,
    objectHeight: 2,
  };
  for (let y = pos.y; y < pos.y + size.height; y++) {
    for (let x = pos.x; x < pos.x + size.width; x++) {
      if (
        x === pos.x ||
        x === pos.x + size.width - 1 ||
        y === pos.y ||
        y === pos.y + size.height - 1
      ) {
        buildingTerrain.push(
          createTerrain(
            rng,
            "Wall",
            "Block",
            { x, y },
            { width: 1, height: 1 },
            wallOptions,
          ),
        );
      }
    }
  }

  // Interior floor sits at ground level — figures inside stand on it at elevation 0.
  buildingTerrain.push(
    createTerrain(
      rng,
      `${name} Interior`,
      "Interior",
      { x: pos.x + 1, y: pos.y + 1 },
      { width: size.width - 2, height: size.height - 2 },
      { blocksLineOfSight: false, parentId: buildingId, objectHeight: 0 },
    ),
  );

  // Roof covers the interior footprint as a flat platform at
  // baseElevation 2 — reachable by climbing an adjacent wall (rulebook:
  // Moving Up and Down). objectHeight is 0 because the roof itself has
  // no thickness for Cover/LoS purposes. A figure on the roof stands
  // above surrounding waist-high cover and gains Height Advantage for
  // Good Shot purposes against ground-level targets.
  buildingTerrain.push(
    createTerrain(
      rng,
      `${name} Roof`,
      "Area",
      { x: pos.x + 1, y: pos.y + 1 },
      { width: size.width - 2, height: size.height - 2 },
      {
        blocksLineOfSight: false,
        providesCover: false,
        isImpassable: false,
        parentId: buildingId,
        baseElevation: 2,
        objectHeight: 0,
      },
    ),
  );

  // Create a door
  const side = Math.floor(rng.float() * 4); // 0: top, 1: bottom, 2: left, 3: right
  let doorPos: Position;
  switch (side) {
    case 0: // top
      doorPos = {
        x: pos.x + 1 + Math.floor(rng.float() * (size.width - 2)),
        y: pos.y,
      };
      break;
    case 1: // bottom
      doorPos = {
        x: pos.x + 1 + Math.floor(rng.float() * (size.width - 2)),
        y: pos.y + size.height - 1,
      };
      break;
    case 2: // left
      doorPos = {
        x: pos.x,
        y: pos.y + 1 + Math.floor(rng.float() * (size.height - 2)),
      };
      break;
    case 3: // right
    default:
      doorPos = {
        x: pos.x + size.width - 1,
        y: pos.y + 1 + Math.floor(rng.float() * (size.height - 2)),
      };
      break;
  }

  // Replace wall with a door
  const wallIndex = buildingTerrain.findIndex(
    (t) => t.position.x === doorPos.x && t.position.y === doorPos.y,
  );
  if (wallIndex !== -1) {
    buildingTerrain.splice(wallIndex, 1);
  }

  // A door is passable at ground level — figures walk through at floor
  // level (objectHeight: 0). When closed, it is opaque to LoS for
  // standing figures: losBlockerHeight: 2 captures that without giving
  // the door physical thickness for movement.
  buildingTerrain.push(
    createTerrain(
      rng,
      "Door",
      "Door",
      doorPos,
      { width: 1, height: 1 },
      {
        isImpassable: false,
        providesCover: true,
        blocksLineOfSight: true,
        isInteractive: true,
        parentId: buildingId,
        objectHeight: 0,
        losBlockerHeight: 2,
      },
    ),
  );

  return buildingTerrain;
}

type FeatureGenerator = (
  rect: Rect,
  existing: Terrain[],
  rng: GenCursor,
) => Terrain[];

const featureGenerators: Record<FeatureType, FeatureGenerator> = (() => {
  const generators: Partial<Record<FeatureType, FeatureGenerator>> = {
    // --- Shared ---
    scatter: (rect, existing, rng) => {
      const terrain: Terrain[] = [];
      const size = { width: 1, height: 1 };
      const pos = findFreeSpot(rect, size, existing, rng);
      if (pos)
        terrain.push(
          createTerrain(rng, "Scatter", "Individual", pos, size, {
            providesCover: true,
            blocksLineOfSight: false,
            objectHeight: 1,
          }),
        );
      return terrain;
    },
    hill: (rect, existing, rng) => {
      const size = { width: rng.d6() + 4, height: rng.d6() + 4 };
      const pos = findFreeSpot(rect, size, existing, rng);
      if (!pos) return [];
      return [
        createTerrain(rng, "Hill", "Area", pos, size, {
          providesCover: true,
          isDifficult: true,
          blocksLineOfSight: false,
          objectHeight: 1,
        }),
      ];
    },
    // --- Industrial ---
    large_structure: (rect, existing, rng) => {
      const size = { width: rng.d6() + 4, height: rng.d6() + 4 };
      const pos = findFreeSpot(rect, size, existing, rng);
      if (!pos) return [];
      return createBuilding("Large Structure", pos, size, rng);
    },
    industrial_cluster: (rect, existing, rng) => {
      const terrain: Terrain[] = [];
      const towerSize = { width: rng.d6() + 1, height: rng.d6() + 1 };
      const towerPos = findFreeSpot(rect, towerSize, existing, rng);

      if (towerPos) {
        // Create the central block
        terrain.push(
          ...createBuilding("Control Tower", towerPos, towerSize, rng),
        );

        // Create surrounding individual equipment pieces
        const equipmentCount = rng.d6();
        for (let i = 0; i < equipmentCount; i++) {
          const eqSize = { width: 1, height: 1 };
          const eqPos = findFreeSpot(
            rect,
            eqSize,
            [...existing, ...terrain],
            rng,
          );
          if (eqPos) {
            terrain.push(
              createTerrain(rng, "Equipment", "Individual", eqPos, eqSize, {
                providesCover: true,
                blocksLineOfSight: false,
                objectHeight: 1,
              }),
            );
          }
        }
      }
      return terrain;
    },
    fenced_area: (rect, existing, rng) => {
      const terrain: Terrain[] = [];
      const areaSize = {
        width: Math.min(12, rect.width - 2),
        height: Math.min(12, rect.height - 2),
      };
      const areaPos = findFreeSpot(rect, areaSize, existing, rng);
      if (!areaPos) return [];
      // Create linear fence pieces. They provide cover and block LOS, but are not impassable.
      // Fences are waist-high (1 unit) — a standing figure sees over but ducking behind gets cover.
      const fenceOptions = {
        providesCover: true,
        blocksLineOfSight: true,
        isImpassable: false,
        objectHeight: 1,
      };
      terrain.push(
        createTerrain(
          rng,
          "Fence Post",
          "Linear",
          { x: areaPos.x, y: areaPos.y },
          { width: areaSize.width, height: 1 },
          fenceOptions,
        ),
      );
      terrain.push(
        createTerrain(
          rng,
          "Fence Post",
          "Linear",
          { x: areaPos.x, y: areaPos.y + areaSize.height - 1 },
          { width: areaSize.width, height: 1 },
          fenceOptions,
        ),
      );
      terrain.push(
        createTerrain(
          rng,
          "Fence Post",
          "Linear",
          { x: areaPos.x, y: areaPos.y },
          { width: 1, height: areaSize.height },
          fenceOptions,
        ),
      );
      terrain.push(
        createTerrain(
          rng,
          "Fence Post",
          "Linear",
          { x: areaPos.x + areaSize.width - 1, y: areaPos.y },
          { width: 1, height: areaSize.height },
          fenceOptions,
        ),
      );
      return terrain;
    },
    landing_pad: (rect, existing, rng) => {
      const size = { width: 10, height: 10 };
      const pos = findFreeSpot(rect, size, existing, rng);
      if (!pos) return [];
      return [
        createTerrain(rng, "Landing Pad", "Area", pos, size, {
          providesCover: false,
          blocksLineOfSight: false,
          objectHeight: 0,
        }),
      ];
    },
    cargo_area: (rect, existing, rng) => {
      const terrain: Terrain[] = [];
      const count = rng.d6() + 2;
      for (let i = 0; i < count; i++) {
        const size = { width: rng.d6() + 1, height: rng.d6() };
        const pos = findFreeSpot(rect, size, [...existing, ...terrain], rng);
        if (pos)
          terrain.push(
            createTerrain(rng, "Container", "Block", pos, size, {
              providesCover: true,
              blocksLineOfSight: true,
              isImpassable: true,
              objectHeight: 1,
            }),
          );
      }
      return terrain;
    },
    two_structures: (rect, existing, rng) => {
      const t: Terrain[] = [];
      const size1 = { width: rng.d6() + 2, height: rng.d6() + 2 };
      const pos1 = findFreeSpot(rect, size1, existing, rng);
      if (pos1) {
        t.push(...createBuilding("Building A", pos1, size1, rng));
      }

      const size2 = { width: rng.d6() + 2, height: rng.d6() + 2 };
      const pos2 = findFreeSpot(rect, size2, [...existing, ...t], rng);
      if (pos2) {
        t.push(...createBuilding("Building B", pos2, size2, rng));
      }
      return t;
    },
    linear_obstacle: (rect, existing, rng) => {
      const len = rng.d6() + 4;
      const size =
        rng.float() > 0.5
          ? { width: len, height: 1 }
          : { width: 1, height: len };
      const pos = findFreeSpot(rect, size, existing, rng);
      if (!pos) return [];
      return [
        createTerrain(rng, "Barricade", "Linear", pos, size, {
          providesCover: true,
          blocksLineOfSight: true,
          isImpassable: false,
          objectHeight: 1,
        }),
      ];
    },
    building: (rect, existing, rng) => {
      const size = { width: rng.d6() + 3, height: rng.d6() + 3 };
      const pos = findFreeSpot(rect, size, existing, rng);
      if (!pos) return [];
      return createBuilding("Building", pos, size, rng);
    },
    industrial_rubble: (rect, existing, rng) => {
      const size = { width: rng.d6() + 3, height: rng.d6() + 3 };
      const pos = findFreeSpot(rect, size, existing, rng);
      if (!pos) return [];
      return [
        createTerrain(rng, "Rubble", "Area", pos, size, {
          isDifficult: true,
          providesCover: true,
          blocksLineOfSight: false,
          objectHeight: 1,
        }),
      ];
    },
    spread_scatter: (rect, existing, rng) => {
      const terrain: Terrain[] = [];
      const count = rng.d6() + 2;
      for (let i = 0; i < count; i++) {
        const size = {
          width: rng.d6() > 3 ? 2 : 1,
          height: rng.d6() > 3 ? 2 : 1,
        };
        const pos = findFreeSpot(rect, size, [...existing, ...terrain], rng);
        if (pos)
          terrain.push(
            createTerrain(rng, "Barrel", "Individual", pos, size, {
              providesCover: true,
              blocksLineOfSight: false,
              objectHeight: 1,
            }),
          );
      }
      return terrain;
    },
    open_ground_central: (rect, existing, rng) => {
      const size = { width: 2, height: 2 };
      const pos = findFreeSpot(rect, size, existing, rng);
      if (!pos) return [];
      return [
        createTerrain(rng, "Statue", "Individual", pos, size, {
          providesCover: true,
          blocksLineOfSight: false,
          objectHeight: 2,
        }),
      ];
    },
    industrial_urban_scatter: (rect, existing, rng) => {
      const size = { width: 4, height: 2 };
      const pos = findFreeSpot(rect, size, existing, rng);
      if (!pos) return [];
      return [
        createTerrain(rng, "Vehicle", "Block", pos, size, {
          providesCover: true,
          blocksLineOfSight: true,
          isImpassable: true,
          objectHeight: 1,
        }),
      ];
    },
    // --- Wilderness ---
    large_swamp: (rect, existing, rng) => {
      const size = { width: rng.d6() + 6, height: rng.d6() + 6 };
      const pos = findFreeSpot(rect, size, existing, rng);
      if (!pos) return [];
      // A swamp is a Field that is difficult, but doesn't provide cover or block LOS
      return [
        createTerrain(rng, "Swamp", "Field", pos, size, {
          isDifficult: true,
          providesCover: false,
          blocksLineOfSight: false,
          objectHeight: 0,
        }),
      ];
    },
    natural_linear: (rect, existing, rng) => {
      const len = rng.d6() + 4;
      const size =
        rng.float() > 0.5
          ? { width: len, height: 1 }
          : { width: 1, height: len };
      const pos = findFreeSpot(rect, size, existing, rng);
      if (!pos) return [];
      return [
        createTerrain(rng, "Rock Ridge", "Linear", pos, size, {
          providesCover: true,
          blocksLineOfSight: true,
          isImpassable: false,
          objectHeight: 1,
        }),
      ];
    },
    // --- Alien Ruin ---
    ruined_wall: (rect, existing, rng) => {
      const len = rng.d6() + 6;
      const size =
        rng.float() > 0.5
          ? { width: len, height: 1 }
          : { width: 1, height: len };
      const pos = findFreeSpot(rect, size, existing, rng);
      if (!pos) return [];
      return [
        createTerrain(rng, "Ruined Wall", "Linear", pos, size, {
          providesCover: true,
          blocksLineOfSight: true,
          isImpassable: false,
          objectHeight: 2,
        }),
      ];
    },
    // --- Crash Site ---
    wreckage_line: (rect, existing, rng) => {
      const len = rng.d6() + 6;
      const size =
        rng.float() > 0.5
          ? { width: len, height: 1 }
          : { width: 1, height: len };
      const pos = findFreeSpot(rect, size, existing, rng);
      if (!pos) return [];
      return [
        createTerrain(rng, "Wreckage Line", "Linear", pos, size, {
          providesCover: true,
          blocksLineOfSight: true,
          isImpassable: false,
          objectHeight: 1,
        }),
      ];
    },
  };

  const allFeatures: FeatureType[] = Object.values(
    TERRAIN_THEME_GENERATORS,
  ).flatMap((g) => [...g.notableFeatures, ...g.regularFeatures]);
  for (const feature of allFeatures) {
    if (!generators[feature]) {
      generators[feature] = (rect, existing, rng) => {
        const size = { width: rng.d6() + 1, height: rng.d6() + 1 };
        const pos = findFreeSpot(rect, size, existing, rng);
        if (!pos) return [];
        const name = feature
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        if (
          ["building", "structure", "ruin"].some((keyword) =>
            name.toLowerCase().includes(keyword),
          )
        ) {
          return createBuilding(name, pos, size, rng);
        }
        return [
          createTerrain(rng, name, "Individual", pos, size, {
            providesCover: true,
            blocksLineOfSight: false,
            objectHeight: 1,
          }),
        ];
      };
    }
  }
  return generators as Record<FeatureType, FeatureGenerator>;
})();

const ZONE_TEMPLATES: TacticalZoneSpec[] = [
  {
    id: "player_edge",
    bounds: { x: 0, y: 30, width: 32, height: 2 },
    requirements: {
      minCoverCells: 0,
      maxCoverCells: 6,
      needsElevation: false,
      minPathsTo: ["central_arena"],
      chokepointCount: 0,
      anchorChance: 0,
    },
    themeWeights: {},
  },
  {
    id: "enemy_edge",
    bounds: { x: 0, y: 0, width: 32, height: 2 },
    requirements: {
      minCoverCells: 0,
      maxCoverCells: 6,
      needsElevation: false,
      minPathsTo: ["central_arena"],
      chokepointCount: 0,
      anchorChance: 0,
    },
    themeWeights: {},
  },
  {
    id: "central_arena",
    bounds: { x: 10, y: 10, width: 13, height: 13 },
    requirements: {
      minCoverCells: 25,
      maxCoverCells: 50,
      needsElevation: true,
      minPathsTo: ["north_flank", "south_flank", "player_edge", "enemy_edge"],
      chokepointCount: 0,
      anchorChance: 0.7,
    },
    themeWeights: { building: 2, hill: 2, large_structure: 3 },
  },
  {
    id: "north_flank",
    bounds: { x: 0, y: 8, width: 9, height: 17 },
    requirements: {
      minCoverCells: 15,
      maxCoverCells: 30,
      needsElevation: false,
      minPathsTo: ["central_arena", "player_edge", "enemy_edge"],
      chokepointCount: 1,
      anchorChance: 0.3,
    },
    themeWeights: { linear_obstacle: 2, scatter: 1, natural_linear: 2 },
  },
  {
    id: "south_flank",
    bounds: { x: 23, y: 8, width: 9, height: 17 },
    requirements: {
      minCoverCells: 15,
      maxCoverCells: 30,
      needsElevation: false,
      minPathsTo: ["central_arena", "player_edge", "enemy_edge"],
      chokepointCount: 1,
      anchorChance: 0.3,
    },
    themeWeights: { linear_obstacle: 2, scatter: 1, natural_linear: 2 },
  },
];

const MAX_ANCHORS = 3;
const MIN_ANCHOR_DISTANCE = 8;

type ZoneRequirementOverrides = Partial<TacticalZoneSpec["requirements"]>;
type ZoneOverrides = Partial<Record<string, ZoneRequirementOverrides>>;

const MISSION_OVERRIDES: Record<string, ZoneOverrides> = {
  Eliminate: {
    central_arena: {
      minCoverCells: 35,
      maxCoverCells: 55,
      anchorChance: 1.0,
    },
    north_flank: {
      minCoverCells: 10,
      maxCoverCells: 20,
    },
    south_flank: {
      minCoverCells: 10,
      maxCoverCells: 20,
    },
  },
  Protect: {
    player_edge: {
      minCoverCells: 15,
      maxCoverCells: 25,
    },
    central_arena: {
      minCoverCells: 30,
      maxCoverCells: 50,
    },
    north_flank: {
      minCoverCells: 10,
      maxCoverCells: 20,
    },
    south_flank: {
      minCoverCells: 10,
      maxCoverCells: 20,
    },
  },
};

function applyMissionOverrides(
  zones: TacticalZoneSpec[],
  missionType?: string,
): TacticalZoneSpec[] {
  if (!missionType) return zones;
  const overrides = MISSION_OVERRIDES[missionType];
  if (!overrides) return zones;

  return zones.map((zone) => ({
    ...zone,
    requirements: {
      ...zone.requirements,
      ...overrides[zone.id],
    },
  }));
}

function countCoverCells(terrain: Terrain[], zone: TacticalZoneSpec): number {
  let count = 0;
  const zb = zone.bounds;
  for (let y = zb.y; y < zb.y + zb.height; y++) {
    for (let x = zb.x; x < zb.x + zb.width; x++) {
      const cellTerrain = terrain.find(
        (t) =>
          x >= t.position.x &&
          x < t.position.x + t.size.width &&
          y >= t.position.y &&
          y < t.position.y + t.size.height,
      );
      if (cellTerrain?.providesCover) count++;
    }
  }
  return count;
}

function placeZoneFeatures(
  zone: TacticalZoneSpec,
  themeGenerator: TerrainGeneratorSchema,
  terrain: Terrain[],
  rng: GenCursor,
): void {
  const zb = zone.bounds;
  let coverCells = countCoverCells(terrain, zone);

  // Step 2a: Place elevation if needed
  if (zone.requirements.needsElevation) {
    const elevFeatures = ["large_structure", "building"] as FeatureType[];
    const featureType =
      elevFeatures[Math.floor(rng.float() * elevFeatures.length)];
    const generator = featureGenerators[featureType];
    if (generator) {
      const pieces = generator(zb, terrain, rng);
      terrain.push(...pieces);
      coverCells = countCoverCells(terrain, zone);
    }
  }

  // Step 2b: Fill regular features until cover target reached
  const targetCover =
    zone.requirements.minCoverCells +
    Math.floor(
      rng.float() *
        (zone.requirements.maxCoverCells - zone.requirements.minCoverCells),
    );
  let attempts = 0;
  while (coverCells < targetCover && attempts < 20) {
    attempts++;
    const roll = rng.d6();
    let featureType: FeatureType;
    const weightedKeys = Object.keys(zone.themeWeights) as FeatureType[];
    if (weightedKeys.length > 0) {
      const totalWeight = weightedKeys.reduce(
        (sum, k) => sum + (zone.themeWeights[k] ?? 1),
        0,
      );
      let pick = rng.float() * totalWeight;
      featureType = weightedKeys[0];
      for (const key of weightedKeys) {
        pick -= zone.themeWeights[key] ?? 1;
        if (pick <= 0) {
          featureType = key;
          break;
        }
      }
    } else {
      featureType = themeGenerator.regularFeatures[roll - 1];
    }

    const generator = featureGenerators[featureType];
    if (generator) {
      const pieces = generator(zb, terrain, rng);
      terrain.push(...pieces);
      coverCells = countCoverCells(terrain, zone);
    }
  }

  // Step 2c: Place scatter to fill remaining space (respecting maxCover)
  const scatterCount = rng.d6();
  for (
    let i = 0;
    i < scatterCount && coverCells < zone.requirements.maxCoverCells;
    i++
  ) {
    const pieces = featureGenerators.scatter(zb, terrain, rng);
    terrain.push(...pieces);
    coverCells = countCoverCells(terrain, zone);
  }
}

function isWalkable(
  pos: Position,
  terrain: Terrain[],
  gridSize: { width: number; height: number },
): boolean {
  if (
    pos.x < 0 ||
    pos.x >= gridSize.width ||
    pos.y < 0 ||
    pos.y >= gridSize.height
  )
    return false;
  const cellTerrain = terrain.find(
    (t) =>
      pos.x >= t.position.x &&
      pos.x < t.position.x + t.size.width &&
      pos.y >= t.position.y &&
      pos.y < t.position.y + t.size.height,
  );
  return !cellTerrain?.isImpassable;
}

function findPath(
  start: Position,
  end: Position,
  terrain: Terrain[],
  gridSize: { width: number; height: number },
): Position[] | null {
  const queue: Position[] = [start];
  const visited = new Set<string>([`${start.x},${start.y}`]);
  const parent = new Map<string, string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.x === end.x && current.y === end.y) {
      const path: Position[] = [current];
      let key = `${current.x},${current.y}`;
      while (parent.has(key)) {
        const pKey = parent.get(key)!;
        const [px, py] = pKey.split(",").map(Number);
        path.unshift({ x: px, y: py });
        key = pKey;
      }
      return path;
    }

    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];

    for (const neighbor of neighbors) {
      const nKey = `${neighbor.x},${neighbor.y}`;
      if (!visited.has(nKey) && isWalkable(neighbor, terrain, gridSize)) {
        visited.add(nKey);
        parent.set(nKey, `${current.x},${current.y}`);
        queue.push(neighbor);
      }
    }
  }

  return null;
}

function validateAndRepairConnectivity(
  terrain: Terrain[],
  zones: TacticalZoneSpec[],
  gridSize: { width: number; height: number },
  rng: GenCursor,
): void {
  const playerZone = zones.find((z) => z.id === "player_edge")!;
  const enemyZone = zones.find((z) => z.id === "enemy_edge")!;
  const centralZone = zones.find((z) => z.id === "central_arena")!;

  const playerCenter = {
    x: Math.floor(playerZone.bounds.x + playerZone.bounds.width / 2),
    y: playerZone.bounds.y,
  };
  const enemyCenter = {
    x: Math.floor(enemyZone.bounds.x + enemyZone.bounds.width / 2),
    y: enemyZone.bounds.y + enemyZone.bounds.height - 1,
  };
  const centralCenter = {
    x: Math.floor(centralZone.bounds.x + centralZone.bounds.width / 2),
    y: Math.floor(centralZone.bounds.y + centralZone.bounds.height / 2),
  };

  const mainPath = findPath(playerCenter, enemyCenter, terrain, gridSize);
  const northFlank = zones.find((z) => z.id === "north_flank");
  const southFlank = zones.find((z) => z.id === "south_flank");
  const northPath = northFlank
    ? findPath(
        {
          x: northFlank.bounds.x,
          y: Math.floor(northFlank.bounds.y + northFlank.bounds.height / 2),
        },
        centralCenter,
        terrain,
        gridSize,
      )
    : null;
  const southPath = southFlank
    ? findPath(
        {
          x: southFlank.bounds.x + southFlank.bounds.width - 1,
          y: Math.floor(southFlank.bounds.y + southFlank.bounds.height / 2),
        },
        centralCenter,
        terrain,
        gridSize,
      )
    : null;

  // Repair main path
  if (!mainPath) {
    const midX = Math.floor(gridSize.width / 2);
    for (let y = playerCenter.y; y >= enemyCenter.y; y--) {
      const pos = { x: midX, y };
      const blocker = terrain.find(
        (t) =>
          pos.x >= t.position.x &&
          pos.x < t.position.x + t.size.width &&
          pos.y >= t.position.y &&
          pos.y < t.position.y + t.size.height &&
          t.isImpassable,
      );
      if (blocker) {
        if (blocker.name === "Wall") {
          terrain.push(
            createTerrain(
              rng,
              "Door",
              "Door",
              pos,
              { width: 1, height: 1 },
              {
                isImpassable: false,
                providesCover: true,
                blocksLineOfSight: true,
                isInteractive: true,
                objectHeight: 0,
                losBlockerHeight: 2,
              },
            ),
          );
        } else if (blocker.size.width === 1 && blocker.size.height === 1) {
          const idx = terrain.indexOf(blocker);
          if (idx !== -1) terrain.splice(idx, 1);
        }
        break;
      }
    }
  }

  // Repair north flank
  if (!northPath && northFlank) {
    const gapY = Math.floor(northFlank.bounds.y + northFlank.bounds.height / 2);
    const gapX = northFlank.bounds.x + northFlank.bounds.width;
    const blocker = terrain.find(
      (t) =>
        gapX >= t.position.x &&
        gapX < t.position.x + t.size.width &&
        gapY >= t.position.y &&
        gapY < t.position.y + t.size.height &&
        t.isImpassable,
    );
    if (blocker && blocker.size.width === 1 && blocker.size.height === 1) {
      const idx = terrain.indexOf(blocker);
      if (idx !== -1) terrain.splice(idx, 1);
    }
  }

  // Repair south flank
  if (!southPath && southFlank) {
    const gapY = Math.floor(southFlank.bounds.y + southFlank.bounds.height / 2);
    const gapX = southFlank.bounds.x - 1;
    if (gapX >= 0) {
      const blocker = terrain.find(
        (t) =>
          gapX >= t.position.x &&
          gapX < t.position.x + t.size.width &&
          gapY >= t.position.y &&
          gapY < t.position.y + t.size.height &&
          t.isImpassable,
      );
      if (blocker && blocker.size.width === 1 && blocker.size.height === 1) {
        const idx = terrain.indexOf(blocker);
        if (idx !== -1) terrain.splice(idx, 1);
      }
    }
  }
}

function placeInteractiveProps(
  terrain: Terrain[],
  gridSize: { width: number; height: number },
  rng: GenCursor,
): void {
  // Find chokepoints and elevated positions
  const chokepoints = terrain.filter(
    (t) => t.name === "Choke Barrier" || t.name === "Door",
  );
  const elevated = terrain.filter(
    (t) => t.baseElevation && t.baseElevation > 0,
  );

  // Place explosive barrels near chokepoints (1-3 total)
  const barrelCount = Math.min(3, rng.d6());
  let placed = 0;
  for (const choke of chokepoints) {
    if (placed >= barrelCount) break;
    const size = { width: 1, height: 1 };
    const adjacentPositions = [
      { x: choke.position.x - 1, y: choke.position.y },
      { x: choke.position.x + choke.size.width, y: choke.position.y },
      { x: choke.position.x, y: choke.position.y - 1 },
      { x: choke.position.x, y: choke.position.y + choke.size.height },
    ];
    for (const pos of adjacentPositions) {
      if (
        pos.x >= 0 &&
        pos.x < gridSize.width &&
        pos.y >= 0 &&
        pos.y < gridSize.height
      ) {
        if (!isAreaOccupied(pos, size, terrain)) {
          terrain.push(
            createTerrain(rng, "Explosive Barrel", "Individual", pos, size, {
              providesCover: false,
              blocksLineOfSight: false,
              isInteractive: true,
              objectHeight: 1,
            }),
          );
          placed++;
          break;
        }
      }
    }
  }

  // Place hackable turret on elevated position (0-1)
  if (elevated.length > 0 && rng.float() > 0.5) {
    const platform = elevated[Math.floor(rng.float() * elevated.length)];
    const pos = { x: platform.position.x, y: platform.position.y };
    const size = { width: 1, height: 1 };
    if (!isAreaOccupied(pos, size, terrain)) {
      terrain.push(
        createTerrain(rng, "Turret", "Individual", pos, size, {
          providesCover: true,
          blocksLineOfSight: true,
          isInteractive: true,
          objectHeight: 1,
          baseElevation: platform.baseElevation,
        }),
      );
    }
  }

  // Place lockable doors on building entrances (1-2)
  const buildings = terrain.filter((t) => t.parentId && t.name === "Wall");
  const doorCount = Math.min(2, rng.d6() > 3 ? 2 : 1);
  let doorsPlaced = 0;
  for (const wall of buildings) {
    if (doorsPlaced >= doorCount) break;
    const size = { width: 1, height: 1 };
    const pos = wall.position;
    const idx = terrain.indexOf(wall);
    if (idx !== -1) {
      terrain.splice(idx, 1);
      terrain.push(
        createTerrain(rng, "Lockable Door", "Door", pos, size, {
          isImpassable: true,
          providesCover: true,
          blocksLineOfSight: true,
          isInteractive: true,
          objectHeight: 0,
          losBlockerHeight: 2,
        }),
      );
      doorsPlaced++;
    }
  }
}

function placeTacticalAnchors(
  zones: TacticalZoneSpec[],
  terrain: Terrain[],
  rng: GenCursor,
  missionType?: string,
): PlacedAnchor[] {
  const anchors: PlacedAnchor[] = [];
  const centralZone = zones.find((z) => z.id === "central_arena");
  const flanks = zones.filter(
    (z) => z.id === "north_flank" || z.id === "south_flank",
  );

  const anchorGenerators: Record<
    TacticalAnchorType,
    (zone: TacticalZoneSpec, existing: Terrain[], rng: GenCursor) => Terrain[]
  > = {
    sniper_nest: (zone, existing, rng) => {
      const size = {
        width: rng.d6() > 3 ? 3 : 2,
        height: rng.d6() > 3 ? 3 : 2,
      };
      const pos = findFreeSpot(zone.bounds, size, existing, rng);
      if (!pos) return [];
      return createBuilding("Sniper Nest", pos, size, rng);
    },
    objective_point: (zone, existing, rng) => {
      const size = { width: rng.d6() + 2, height: rng.d6() + 2 };
      const pos = findFreeSpot(zone.bounds, size, existing, rng);
      if (!pos) return [];
      return createBuilding("Objective", pos, size, rng);
    },
    choke_anchor: (zone, existing, rng) => {
      const len = rng.d6() + 3;
      const size =
        rng.float() > 0.5
          ? { width: len, height: 1 }
          : { width: 1, height: len };
      const pos = findFreeSpot(zone.bounds, size, existing, rng);
      if (!pos) return [];
      return [
        createTerrain(rng, "Choke Barrier", "Linear", pos, size, {
          providesCover: true,
          blocksLineOfSight: true,
          isImpassable: false,
          objectHeight: 1,
        }),
      ];
    },
    danger_zone: (zone, existing, rng) => {
      const pieces: Terrain[] = [];
      const count = rng.d6() + 1;
      for (let i = 0; i < count; i++) {
        const size = { width: 1, height: 1 };
        const pos = findFreeSpot(
          zone.bounds,
          size,
          [...existing, ...pieces],
          rng,
        );
        if (pos) {
          pieces.push(
            createTerrain(rng, "Fuel Barrel", "Individual", pos, size, {
              providesCover: false,
              blocksLineOfSight: false,
              isInteractive: true,
              objectHeight: 1,
            }),
          );
        }
      }
      return pieces;
    },
    evacuation_point: (zone, existing, rng) => {
      const size = { width: 2, height: 2 };
      const pos = findFreeSpot(zone.bounds, size, existing, rng);
      if (!pos) return [];
      return [
        createTerrain(rng, "Evacuation Point", "Area", pos, size, {
          providesCover: true,
          blocksLineOfSight: false,
          isImpassable: false,
          baseElevation: 1,
          objectHeight: 0,
        }),
      ];
    },
  };

  // Place at least 1 anchor in central
  if (centralZone && rng.float() < centralZone.requirements.anchorChance) {
    let type: TacticalAnchorType;
    if (missionType === "Eliminate") {
      type = "objective_point"; // command_post maps to objective_point anchor type
    } else {
      const types: TacticalAnchorType[] = [
        "sniper_nest",
        "objective_point",
        "danger_zone",
      ];
      type = types[Math.floor(rng.float() * types.length)];
    }
    const pieces = anchorGenerators[type](centralZone, terrain, rng);
    if (pieces.length > 0) {
      terrain.push(...pieces);
      anchors.push({
        type,
        position: pieces[0].position,
        zoneId: centralZone.id,
      });
    }
  }

  // Place evacuation point on player_edge for Protect
  if (missionType === "Protect") {
    const playerZone = zones.find((z) => z.id === "player_edge");
    if (playerZone) {
      const pieces = anchorGenerators["evacuation_point"](
        playerZone,
        terrain,
        rng,
      );
      if (pieces.length > 0) {
        terrain.push(...pieces);
        anchors.push({
          type: "evacuation_point",
          position: pieces[0].position,
          zoneId: playerZone.id,
        });
      }
    }
  }

  // Place 1-2 more in flanks
  for (const flank of flanks) {
    if (anchors.length >= MAX_ANCHORS) break;
    if (rng.float() < flank.requirements.anchorChance) {
      const types: TacticalAnchorType[] = [
        "choke_anchor",
        "danger_zone",
        "sniper_nest",
      ];
      const type = types[Math.floor(rng.float() * types.length)];
      const pieces = anchorGenerators[type](flank, terrain, rng);
      if (pieces.length > 0) {
        const tooClose = anchors.some(
          (a) =>
            Math.abs(a.position.x - pieces[0].position.x) <=
              MIN_ANCHOR_DISTANCE &&
            Math.abs(a.position.y - pieces[0].position.y) <=
              MIN_ANCHOR_DISTANCE,
        );
        if (!tooClose) {
          terrain.push(...pieces);
          anchors.push({
            type,
            position: pieces[0].position,
            zoneId: flank.id,
          });
        }
      }
    }
  }

  return anchors;
}

export const generateTerrain = (
  theme: TerrainTheme,
  gridSize: { width: number; height: number },
  worldTraits: WorldTrait[] = [],
  rngState: SeededRngState,
  missionType?: string,
): { terrain: Terrain[]; rng: SeededRngState } => {
  const rng = createGenCursor(rngState);
  const terrain: Terrain[] = [];
  const themeGenerator = TERRAIN_THEME_GENERATORS[theme];

  // Scale zones to grid size
  const scaleX = gridSize.width / 32;
  const scaleY = gridSize.height / 32;
  const zones = ZONE_TEMPLATES.map((z) => {
    const x = Math.floor(z.bounds.x * scaleX);
    const y = Math.floor(z.bounds.y * scaleY);
    const width = Math.max(3, Math.floor(z.bounds.width * scaleX));
    const height = Math.max(3, Math.floor(z.bounds.height * scaleY));
    return {
      ...z,
      bounds: {
        x,
        y,
        width: Math.min(width, gridSize.width - x),
        height: Math.min(height, gridSize.height - y),
      },
    };
  });

  const overriddenZones = applyMissionOverrides(zones, missionType);

  let attempts = 0;
  let valid = false;
  let finalTerrain: Terrain[] = [];

  while (attempts < 5 && !valid) {
    attempts++;
    const attemptTerrain: Terrain[] = [];

    for (const zone of overriddenZones) {
      placeZoneFeatures(zone, themeGenerator, attemptTerrain, rng);
    }

    placeTacticalAnchors(overriddenZones, attemptTerrain, rng, missionType);

    placeInteractiveProps(attemptTerrain, gridSize, rng);

    validateAndRepairConnectivity(
      attemptTerrain,
      overriddenZones,
      gridSize,
      rng,
    );

    // Final validation check
    const playerCenter = {
      x: Math.floor(gridSize.width / 2),
      y: gridSize.height - 2,
    };
    const enemyCenter = { x: Math.floor(gridSize.width / 2), y: 1 };
    const path = findPath(playerCenter, enemyCenter, attemptTerrain, gridSize);

    if (path) {
      valid = true;
      finalTerrain = attemptTerrain;
    }
  }

  terrain.push(...finalTerrain);

  // Place scatter in remaining free areas (global)
  const globalRect = {
    x: 0,
    y: 0,
    width: gridSize.width,
    height: gridSize.height,
  };
  const globalScatterCount = rng.d6() + 2;
  for (let i = 0; i < globalScatterCount; i++) {
    const pieces = featureGenerators.scatter(globalRect, terrain, rng);
    terrain.push(...pieces);
  }

  // Add Crystals for world trait
  if (worldTraits.some((t) => t.id === "crystals")) {
    const crystalCount = rng.d6() + rng.d6();
    const rect = { x: 0, y: 0, width: gridSize.width, height: gridSize.height };
    for (let i = 0; i < crystalCount; i++) {
      const size = { width: 1, height: 1 };
      const pos = findFreeSpot(rect, size, terrain, rng);
      if (pos) {
        terrain.push(
          createTerrain(rng, "Crystal", "Individual", pos, size, {
            providesCover: true,
            blocksLineOfSight: false,
            objectHeight: 1,
          }),
        );
      }
    }
  }

  return { terrain, rng: rng.getState() };
};
