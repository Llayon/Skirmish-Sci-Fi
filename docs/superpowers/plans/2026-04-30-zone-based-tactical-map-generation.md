# Zone-Based Tactical Map Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace quarter-based terrain placement with zone-based tactical generation, add connectivity validation, tactical anchors, and interactive environment props.

**Architecture:** Keep existing `generateTerrain()` signature and feature generators. Add zone specs that constrain where features are placed. Validate connectivity with A* and repair blocked paths. Place 2-3 tactical anchors per map. Add interactive terrain types (barrels, turrets, doors) as placable objects.

**Tech Stack:** TypeScript, Vitest, deterministic Mulberry32 RNG (existing)

---

## File Structure

| File | Action | Responsibility |
|------|--------|--------------|
| `services/terrainGenerator.ts` | **Modify** | Core generator: add zone system, anchors, connectivity validation, interactive props |
| `types/index.ts` or `types/terrain.ts` | **Modify** | Add `TacticalAnchorType`, `InteractiveTerrainType`, `TacticalZoneSpec` |
| `services/terrainGenerator.test.ts` | **Create** | Unit tests for zone bounds, cover density, connectivity, determinism |
| `tests/scenarios/parity/enginev2_terrain_generation_parity.test.ts` | **Modify** | Update snapshots after generator changes |

---

## Task 1: Add Zone System Types

**Files:**
- Modify: `types/index.ts` (or wherever `Terrain` is exported)
- Modify: `services/terrainGenerator.ts`

**Context:** `Terrain` type and related types live in `/types`. Add new interfaces there so they can be imported by tests.

- [ ] **Step 1: Add new types to the types file**

In `/types/index.ts` (or the file that exports `Terrain`), append:

```typescript
export type TacticalAnchorType = 'sniper_nest' | 'objective_point' | 'choke_anchor' | 'danger_zone';

export type InteractiveTerrainType = 'door' | 'explosive_barrel' | 'hackable_turret' | 'lockable_door';

export interface TacticalZoneSpec {
  id: string;
  bounds: { x: number; y: number; width: number; height: number };
  requirements: {
    minCoverCells: number;
    maxCoverCells: number;
    needsElevation: boolean;
    minPathsTo: string[];
    chokepointCount: number;
    anchorChance: number;
  };
  themeWeights: Partial<Record<FeatureType, number>>;
}

export interface PlacedAnchor {
  type: TacticalAnchorType;
  position: Position;
  zoneId: string;
}
```

- [ ] **Step 2: Import new types in terrainGenerator.ts**

Add to existing imports in `services/terrainGenerator.ts`:

```typescript
import { Terrain, Position, TerrainTheme, FeatureType, WorldTrait, TacticalZoneSpec, TacticalAnchorType, PlacedAnchor, InteractiveTerrainType } from '../types';
```

- [ ] **Step 3: Commit**

```bash
git add types/ services/terrainGenerator.ts
git commit -m "feat(rules): add zone system and tactical anchor types"
```

---

## Task 2: Implement Zone Templates

**Files:**
- Modify: `services/terrainGenerator.ts`

**Context:** Zone templates define the tactical layout for a standard 32×32 map. Add them as a constant above `generateTerrain`.

- [ ] **Step 1: Add ZONE_TEMPLATES constant**

After the `featureGenerators` IIFE, add:

```typescript
const ZONE_TEMPLATES: TacticalZoneSpec[] = [
  {
    id: 'player_edge',
    bounds: { x: 0, y: 30, width: 32, height: 2 },
    requirements: { minCoverCells: 0, maxCoverCells: 6, needsElevation: false, minPathsTo: ['central_arena'], chokepointCount: 0, anchorChance: 0 },
    themeWeights: {}
  },
  {
    id: 'enemy_edge',
    bounds: { x: 0, y: 0, width: 32, height: 2 },
    requirements: { minCoverCells: 0, maxCoverCells: 6, needsElevation: false, minPathsTo: ['central_arena'], chokepointCount: 0, anchorChance: 0 },
    themeWeights: {}
  },
  {
    id: 'central_arena',
    bounds: { x: 10, y: 10, width: 13, height: 13 },
    requirements: { minCoverCells: 25, maxCoverCells: 50, needsElevation: true, minPathsTo: ['north_flank', 'south_flank', 'player_edge', 'enemy_edge'], chokepointCount: 0, anchorChance: 0.7 },
    themeWeights: { building: 2, hill: 2, large_structure: 3 }
  },
  {
    id: 'north_flank',
    bounds: { x: 0, y: 8, width: 9, height: 17 },
    requirements: { minCoverCells: 15, maxCoverCells: 30, needsElevation: false, minPathsTo: ['central_arena', 'player_edge', 'enemy_edge'], chokepointCount: 1, anchorChance: 0.3 },
    themeWeights: { linear_obstacle: 2, scatter: 1, natural_linear: 2 }
  },
  {
    id: 'south_flank',
    bounds: { x: 23, y: 8, width: 9, height: 17 },
    requirements: { minCoverCells: 15, maxCoverCells: 30, needsElevation: false, minPathsTo: ['central_arena', 'player_edge', 'enemy_edge'], chokepointCount: 1, anchorChance: 0.3 },
    themeWeights: { linear_obstacle: 2, scatter: 1, natural_linear: 2 }
  }
];

const MAX_ANCHORS = 3;
const MIN_ANCHOR_DISTANCE = 8;
```

- [ ] **Step 2: Commit**

```bash
git add services/terrainGenerator.ts
git commit -m "feat(rules): add ZONE_TEMPLATES for tactical zone layout"
```

---

## Task 3: Add Zone Placement Algorithm

**Files:**
- Modify: `services/terrainGenerator.ts`

**Context:** Replace the current Step 1-4 (quarters, center feature, regular features per quarter) with zone-based placement. The existing Step 5+ (crystals, scatter) stays mostly the same.

- [ ] **Step 1: Add helper to count cover cells in a zone**

Add before `generateTerrain`:

```typescript
function countCoverCells(terrain: Terrain[], zone: TacticalZoneSpec): number {
  let count = 0;
  const zb = zone.bounds;
  for (let y = zb.y; y < zb.y + zb.height; y++) {
    for (let x = zb.x; x < zb.x + zb.width; x++) {
      const cellTerrain = terrain.find(t =>
        x >= t.position.x && x < t.position.x + t.size.width &&
        y >= t.position.y && y < t.position.y + t.size.height
      );
      if (cellTerrain?.providesCover) count++;
    }
  }
  return count;
}
```

- [ ] **Step 2: Add zone feature placement helper**

```typescript
function placeZoneFeatures(
  zone: TacticalZoneSpec,
  themeGenerator: TerrainGeneratorSchema,
  terrain: Terrain[],
  rng: GenCursor
): void {
  const zb = zone.bounds;
  let coverCells = countCoverCells(terrain, zone);

  // Step 2a: Place elevation if needed
  if (zone.requirements.needsElevation) {
    const elevFeatures = ['large_structure', 'building', 'hill'] as FeatureType[];
    const featureType = elevFeatures[Math.floor(rng.float() * elevFeatures.length)];
    const generator = featureGenerators[featureType];
    if (generator) {
      const pieces = generator(zb, terrain, rng);
      terrain.push(...pieces);
      coverCells = countCoverCells(terrain, zone);
    }
  }

  // Step 2b: Fill regular features until cover target reached
  const targetCover = zone.requirements.minCoverCells + Math.floor(rng.float() * (zone.requirements.maxCoverCells - zone.requirements.minCoverCells));
  let attempts = 0;
  while (coverCells < targetCover && attempts < 20) {
    attempts++;
    const roll = rng.d6();
    // Use themeWeights if available, otherwise default to regularFeatures
    let featureType: FeatureType;
    const weightedKeys = Object.keys(zone.themeWeights) as FeatureType[];
    if (weightedKeys.length > 0) {
      const totalWeight = weightedKeys.reduce((sum, k) => sum + (zone.themeWeights[k] ?? 1), 0);
      let pick = rng.float() * totalWeight;
      featureType = weightedKeys[0];
      for (const key of weightedKeys) {
        pick -= (zone.themeWeights[key] ?? 1);
        if (pick <= 0) { featureType = key; break; }
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
  for (let i = 0; i < scatterCount && coverCells < zone.requirements.maxCoverCells; i++) {
    const pieces = featureGenerators.scatter(zb, terrain, rng);
    terrain.push(...pieces);
    coverCells = countCoverCells(terrain, zone);
  }
}
```

- [ ] **Step 3: Replace generateTerrain body with zone-based logic**

Replace the body of `generateTerrain` (keep the function signature):

```typescript
export const generateTerrain = (
    theme: TerrainTheme,
    gridSize: { width: number; height: number },
    worldTraits: WorldTrait[] = [],
    rngState: SeededRngState,
): { terrain: Terrain[]; rng: SeededRngState } => {
    const rng = createGenCursor(rngState);
    const terrain: Terrain[] = [];
    const themeGenerator = TERRAIN_THEME_GENERATORS[theme];

    // Scale zones to grid size
    const scaleX = gridSize.width / 32;
    const scaleY = gridSize.height / 32;
    const zones = ZONE_TEMPLATES.map(z => ({
      ...z,
      bounds: {
        x: Math.floor(z.bounds.x * scaleX),
        y: Math.floor(z.bounds.y * scaleY),
        width: Math.max(3, Math.floor(z.bounds.width * scaleX)),
        height: Math.max(3, Math.floor(z.bounds.height * scaleY))
      }
    }));

    // Place features per zone
    for (const zone of zones) {
      placeZoneFeatures(zone, themeGenerator, terrain, rng);
    }

    // Place tactical anchors (Task 5 will implement this call)
    // placeTacticalAnchors(zones, terrain, rng);

    // Validate and repair connectivity (Task 4 will implement this)
    // validateAndRepairConnectivity(terrain, zones, gridSize, rng);

    // Place scatter in remaining free areas (global)
    const globalRect = { x: 0, y: 0, width: gridSize.width, height: gridSize.height };
    const globalScatterCount = rng.d6() + 2;
    for (let i = 0; i < globalScatterCount; i++) {
      const pieces = featureGenerators.scatter(globalRect, terrain, rng);
      terrain.push(...pieces);
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
};
```

**Note:** The `placeTacticalAnchors` and `validateAndRepairConnectivity` calls are commented out and will be uncommented in later tasks.

- [ ] **Step 4: Run existing parity test to ensure structure is valid**

```bash
npx vitest run tests/scenarios/parity/enginev2_terrain_generation_parity.test.ts
```

Expected: Tests pass (snapshot may fail due to layout change, but structural tests should pass).

- [ ] **Step 5: Commit**

```bash
git add services/terrainGenerator.ts
git commit -m "feat(rules): implement zone-based feature placement algorithm"
```

---

## Task 4: Add Connectivity Validation

**Files:**
- Modify: `services/terrainGenerator.ts`

**Context:** After terrain is placed, ensure there are paths between deployment edges and central arena. Use simple BFS/A* on the grid.

- [ ] **Step 1: Add pathfinding helper for validation**

Add before `generateTerrain`:

```typescript
function isWalkable(pos: Position, terrain: Terrain[], gridSize: { width: number; height: number }): boolean {
  if (pos.x < 0 || pos.x >= gridSize.width || pos.y < 0 || pos.y >= gridSize.height) return false;
  const cellTerrain = terrain.find(t =>
    pos.x >= t.position.x && pos.x < t.position.x + t.size.width &&
    pos.y >= t.position.y && pos.y < t.position.y + t.size.height
  );
  return !cellTerrain?.isImpassable;
}

function findPath(
  start: Position,
  end: Position,
  terrain: Terrain[],
  gridSize: { width: number; height: number }
): Position[] | null {
  // Simple BFS for connectivity check
  const queue: Position[] = [start];
  const visited = new Set<string>([`${start.x},${start.y}`]);
  const parent = new Map<string, string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.x === end.x && current.y === end.y) {
      // Reconstruct path
      const path: Position[] = [current];
      let key = `${current.x},${current.y}`;
      while (parent.has(key)) {
        const pKey = parent.get(key)!;
        const [px, py] = pKey.split(',').map(Number);
        path.unshift({ x: px, y: py });
        key = pKey;
      }
      return path;
    }

    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 }
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
  rng: GenCursor
): void {
  const playerZone = zones.find(z => z.id === 'player_edge')!;
  const enemyZone = zones.find(z => z.id === 'enemy_edge')!;
  const centralZone = zones.find(z => z.id === 'central_arena')!;

  const playerCenter = { x: Math.floor(playerZone.bounds.x + playerZone.bounds.width / 2), y: playerZone.bounds.y };
  const enemyCenter = { x: Math.floor(enemyZone.bounds.x + enemyZone.bounds.width / 2), y: enemyZone.bounds.y + enemyZone.bounds.height - 1 };
  const centralCenter = { x: Math.floor(centralZone.bounds.x + centralZone.bounds.width / 2), y: Math.floor(centralZone.bounds.y + centralZone.bounds.height / 2) };

  // Check main path
  let mainPath = findPath(playerCenter, enemyCenter, terrain, gridSize);

  // Check flank paths
  const northFlank = zones.find(z => z.id === 'north_flank');
  const southFlank = zones.find(z => z.id === 'south_flank');
  const northPath = northFlank ? findPath({ x: northFlank.bounds.x, y: Math.floor(northFlank.bounds.y + northFlank.bounds.height / 2) }, centralCenter, terrain, gridSize) : null;
  const southPath = southFlank ? findPath({ x: southFlank.bounds.x + southFlank.bounds.width - 1, y: Math.floor(southFlank.bounds.y + southFlank.bounds.height / 2) }, centralCenter, terrain, gridSize) : null;

  // Repair if main path blocked
  if (!mainPath) {
    // Find blocking terrain on straight line and add gap/door
    const midX = Math.floor(gridSize.width / 2);
    for (let y = playerCenter.y; y >= enemyCenter.y; y--) {
      const pos = { x: midX, y };
      const blocker = terrain.find(t =>
        pos.x >= t.position.x && pos.x < t.position.x + t.size.width &&
        pos.y >= t.position.y && pos.y < t.position.y + t.size.height &&
        t.isImpassable
      );
      if (blocker) {
        // Replace with door or remove
        if (blocker.name === 'Wall') {
          terrain.push(createTerrain(rng, 'Door', 'Door', pos, { width: 1, height: 1 }, { isImpassable: false, providesCover: true, blocksLineOfSight: true, isInteractive: true, objectHeight: 0, losBlockerHeight: 2 }));
        } else if (blocker.size.width === 1 && blocker.size.height === 1) {
          // Remove single-cell blocker
          const idx = terrain.indexOf(blocker);
          if (idx !== -1) terrain.splice(idx, 1);
        }
        break;
      }
    }
  }

  // Repair flank paths
  if (!northPath && northFlank) {
    const gapY = Math.floor(northFlank.bounds.y + northFlank.bounds.height / 2);
    const gapX = northFlank.bounds.x + northFlank.bounds.width;
    const blocker = terrain.find(t =>
      gapX >= t.position.x && gapX < t.position.x + t.size.width &&
      gapY >= t.position.y && gapY < t.position.y + t.size.height &&
      t.isImpassable
    );
    if (blocker && blocker.size.width === 1 && blocker.size.height === 1) {
      const idx = terrain.indexOf(blocker);
      if (idx !== -1) terrain.splice(idx, 1);
    }
  }

  if (!southPath && southFlank) {
    const gapY = Math.floor(southFlank.bounds.y + southFlank.bounds.height / 2);
    const gapX = southFlank.bounds.x - 1;
    if (gapX >= 0) {
      const blocker = terrain.find(t =>
        gapX >= t.position.x && gapX < t.position.x + t.size.width &&
        gapY >= t.position.y && gapY < t.position.y + t.size.height &&
        t.isImpassable
      );
      if (blocker && blocker.size.width === 1 && blocker.size.height === 1) {
        const idx = terrain.indexOf(blocker);
        if (idx !== -1) terrain.splice(idx, 1);
      }
    }
  }
}
```

- [ ] **Step 2: Wire up connectivity validation in generateTerrain**

Uncomment the call in `generateTerrain`:

```typescript
    // Validate and repair connectivity
    validateAndRepairConnectivity(terrain, zones, gridSize, rng);
```

- [ ] **Step 3: Add retry loop for total regeneration**

Wrap the zone placement in a retry loop:

```typescript
    let attempts = 0;
    let valid = false;
    let finalTerrain: Terrain[] = [];

    while (attempts < 5 && !valid) {
      attempts++;
      const attemptTerrain: Terrain[] = [];

      for (const zone of zones) {
        placeZoneFeatures(zone, themeGenerator, attemptTerrain, rng);
      }

      validateAndRepairConnectivity(attemptTerrain, zones, gridSize, rng);

      // Final validation check
      const playerCenter = { x: Math.floor(gridSize.width / 2), y: gridSize.height - 2 };
      const enemyCenter = { x: Math.floor(gridSize.width / 2), y: 1 };
      const path = findPath(playerCenter, enemyCenter, attemptTerrain, gridSize);

      if (path) {
        valid = true;
        finalTerrain = attemptTerrain;
      }
    }

    terrain.push(...finalTerrain);
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/scenarios/parity/enginev2_terrain_generation_parity.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add services/terrainGenerator.ts
git commit -m "feat(rules): add connectivity validation with BFS pathfinding and repair"
```

---

## Task 5: Add Tactical Anchors

**Files:**
- Modify: `services/terrainGenerator.ts`

**Context:** Place 2-3 key tactical features that draw combat.

- [ ] **Step 1: Add anchor placement function**

Add before `generateTerrain`:

```typescript
function placeTacticalAnchors(
  zones: TacticalZoneSpec[],
  terrain: Terrain[],
  rng: GenCursor
): PlacedAnchor[] {
  const anchors: PlacedAnchor[] = [];
  const centralZone = zones.find(z => z.id === 'central_arena');
  const flanks = zones.filter(z => z.id === 'north_flank' || z.id === 'south_flank');

  // Anchor types mapped to feature generators
  const anchorGenerators: Record<TacticalAnchorType, (zone: TacticalZoneSpec, existing: Terrain[], rng: GenCursor) => Terrain[]> = {
    sniper_nest: (zone, existing, rng) => {
      const size = { width: rng.d6() > 3 ? 3 : 2, height: rng.d6() > 3 ? 3 : 2 };
      const pos = findFreeSpot(zone.bounds, size, existing, rng);
      if (!pos) return [];
      return createBuilding('Sniper Nest', pos, size, rng);
    },
    objective_point: (zone, existing, rng) => {
      const size = { width: rng.d6() + 2, height: rng.d6() + 2 };
      const pos = findFreeSpot(zone.bounds, size, existing, rng);
      if (!pos) return [];
      return createBuilding('Objective', pos, size, rng);
    },
    choke_anchor: (zone, existing, rng) => {
      const len = rng.d6() + 3;
      const size = rng.float() > 0.5 ? { width: len, height: 1 } : { width: 1, height: len };
      const pos = findFreeSpot(zone.bounds, size, existing, rng);
      if (!pos) return [];
      return [createTerrain(rng, 'Choke Barrier', 'Linear', pos, size, { providesCover: true, blocksLineOfSight: true, isImpassable: false, objectHeight: 1 })];
    },
    danger_zone: (zone, existing, rng) => {
      const pieces: Terrain[] = [];
      const count = rng.d6() + 1;
      for (let i = 0; i < count; i++) {
        const size = { width: 1, height: 1 };
        const pos = findFreeSpot(zone.bounds, size, [...existing, ...pieces], rng);
        if (pos) {
          pieces.push(createTerrain(rng, 'Fuel Barrel', 'Individual', pos, size, { providesCover: false, blocksLineOfSight: false, isInteractive: true, objectHeight: 1 }));
        }
      }
      return pieces;
    }
  };

  // Place at least 1 anchor in central
  if (centralZone && rng.float() < centralZone.requirements.anchorChance) {
    const types: TacticalAnchorType[] = ['sniper_nest', 'objective_point', 'danger_zone'];
    const type = types[Math.floor(rng.float() * types.length)];
    const pieces = anchorGenerators[type](centralZone, terrain, rng);
    if (pieces.length > 0) {
      terrain.push(...pieces);
      anchors.push({ type, position: pieces[0].position, zoneId: centralZone.id });
    }
  }

  // Place 1-2 more in flanks
  for (const flank of flanks) {
    if (anchors.length >= MAX_ANCHORS) break;
    if (rng.float() < flank.requirements.anchorChance) {
      const types: TacticalAnchorType[] = ['choke_anchor', 'danger_zone', 'sniper_nest'];
      const type = types[Math.floor(rng.float() * types.length)];
      const pieces = anchorGenerators[type](flank, terrain, rng);
      if (pieces.length > 0) {
        // Check distance from existing anchors
        const tooClose = anchors.some(a =>
          Math.abs(a.position.x - pieces[0].position.x) <= MIN_ANCHOR_DISTANCE &&
          Math.abs(a.position.y - pieces[0].position.y) <= MIN_ANCHOR_DISTANCE
        );
        if (!tooClose) {
          terrain.push(...pieces);
          anchors.push({ type, position: pieces[0].position, zoneId: flank.id });
        }
      }
    }
  }

  return anchors;
}
```

- [ ] **Step 2: Wire up anchor placement in generateTerrain**

In the retry loop, after `placeZoneFeatures` and before `validateAndRepairConnectivity`:

```typescript
      placeTacticalAnchors(zones, attemptTerrain, rng);
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run tests/scenarios/parity/enginev2_terrain_generation_parity.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add services/terrainGenerator.ts
git commit -m "feat(rules): add tactical anchors with distance constraints"
```

---

## Task 6: Add Interactive Environment Props

**Files:**
- Modify: `services/terrainGenerator.ts`

**Context:** Place explosive barrels, turrets, lockable doors near tactical points. These reuse the existing `isInteractive` flag.

- [ ] **Step 1: Add interactive prop placement function**

Add before `generateTerrain`:

```typescript
function placeInteractiveProps(
  terrain: Terrain[],
  gridSize: { width: number; height: number },
  rng: GenCursor
): void {
  // Find chokepoints and elevated positions
  const chokepoints = terrain.filter(t => t.name === 'Choke Barrier' || t.name === 'Door');
  const elevated = terrain.filter(t => t.baseElevation && t.baseElevation > 0);

  // Place explosive barrels near chokepoints (1-3 total)
  const barrelCount = Math.min(3, rng.d6());
  let placed = 0;
  for (const choke of chokepoints) {
    if (placed >= barrelCount) break;
    const size = { width: 1, height: 1 };
    // Place adjacent to chokepoint
    const adjacentPositions = [
      { x: choke.position.x - 1, y: choke.position.y },
      { x: choke.position.x + choke.size.width, y: choke.position.y },
      { x: choke.position.x, y: choke.position.y - 1 },
      { x: choke.position.x, y: choke.position.y + choke.size.height }
    ];
    for (const pos of adjacentPositions) {
      if (pos.x >= 0 && pos.x < gridSize.width && pos.y >= 0 && pos.y < gridSize.height) {
        if (!isAreaOccupied(pos, size, terrain)) {
          terrain.push(createTerrain(rng, 'Explosive Barrel', 'Individual', pos, size, { providesCover: false, blocksLineOfSight: false, isInteractive: true, objectHeight: 1 }));
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
    // Check if position is free (roof might already have something)
    const size = { width: 1, height: 1 };
    if (!isAreaOccupied(pos, size, terrain)) {
      terrain.push(createTerrain(rng, 'Turret', 'Individual', pos, size, { providesCover: true, blocksLineOfSight: true, isInteractive: true, objectHeight: 1, baseElevation: platform.baseElevation }));
    }
  }

  // Place lockable doors on building entrances (1-2)
  const buildings = terrain.filter(t => t.parentId && t.name === 'Wall');
  const doorCount = Math.min(2, rng.d6() > 3 ? 2 : 1);
  let doorsPlaced = 0;
  for (const wall of buildings) {
    if (doorsPlaced >= doorCount) break;
    // Only replace walls that are at building edge
    const size = { width: 1, height: 1 };
    const pos = wall.position;
    const idx = terrain.indexOf(wall);
    if (idx !== -1) {
      terrain.splice(idx, 1);
      terrain.push(createTerrain(rng, 'Lockable Door', 'Door', pos, size, { isImpassable: true, providesCover: true, blocksLineOfSight: true, isInteractive: true, objectHeight: 0, losBlockerHeight: 2 }));
      doorsPlaced++;
    }
  }
}
```

- [ ] **Step 2: Wire up in generateTerrain**

Add after `placeTacticalAnchors` in the retry loop:

```typescript
      placeInteractiveProps(attemptTerrain, gridSize, rng);
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run tests/scenarios/parity/enginev2_terrain_generation_parity.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add services/terrainGenerator.ts
git commit -m "feat(rules): add interactive environment props (barrels, turrets, doors)"
```

---

## Task 7: Write Unit Tests

**Files:**
- Create: `services/terrainGenerator.test.ts`

**Context:** Comprehensive unit tests for the new zone-based generator.

- [ ] **Step 1: Create test file with structural invariant tests**

```typescript
import { describe, it, expect } from 'vitest';
import { generateTerrain } from './terrainGenerator';
import { createRng } from './engine/rng/rng';
import { TerrainTheme } from '../types';

const gridSize = { width: 32, height: 32 };

function stripIds(terrain: any[]) {
  return terrain.map((t) => {
    const copy = { ...t };
    delete copy.id;
    delete copy.parentId;
    return copy;
  });
}

describe('Zone-based terrain generation', () => {
  const themes: TerrainTheme[] = ['Industrial', 'Wilderness', 'AlienRuin', 'CrashSite'];

  themes.forEach((theme) => {
    it(`[${theme}] every terrain piece is inside the grid`, () => {
      const { terrain } = generateTerrain(theme, gridSize, [], createRng(7777));
      for (const t of terrain) {
        expect(t.position.x).toBeGreaterThanOrEqual(0);
        expect(t.position.y).toBeGreaterThanOrEqual(0);
        expect(t.position.x + t.size.width).toBeLessThanOrEqual(gridSize.width);
        expect(t.position.y + t.size.height).toBeLessThanOrEqual(gridSize.height);
      }
    });

    it(`[${theme}] no overlapping terrain pieces`, () => {
      const { terrain } = generateTerrain(theme, gridSize, [], createRng(7777));
      for (let i = 0; i < terrain.length; i++) {
        for (let j = i + 1; j < terrain.length; j++) {
          const a = terrain[i];
          const b = terrain[j];
          const overlap =
            a.position.x < b.position.x + b.size.width &&
            a.position.x + a.size.width > b.position.x &&
            a.position.y < b.position.y + b.size.height &&
            a.position.y + a.size.height > b.position.y;
          expect(overlap).toBe(false);
        }
      }
    });

    it(`[${theme}] has at least one elevated position`, () => {
      const { terrain } = generateTerrain(theme, gridSize, [], createRng(7777));
      const elevated = terrain.filter(t => (t.baseElevation ?? 0) > 0);
      expect(elevated.length).toBeGreaterThan(0);
    });

    it(`[${theme}] has interactive props when expected`, () => {
      const { terrain } = generateTerrain(theme, gridSize, [], createRng(7777));
      const interactive = terrain.filter(t => t.isInteractive);
      // Should have at least doors (from buildings)
      expect(interactive.length).toBeGreaterThan(0);
    });
  });

  it('determinism: same seed produces identical terrain', () => {
    const a = generateTerrain('Industrial', gridSize, [], createRng(12345));
    const b = generateTerrain('Industrial', gridSize, [], createRng(12345));
    expect(stripIds(a.terrain)).toEqual(stripIds(b.terrain));
  });

  it('different seeds produce different terrain', () => {
    const a = generateTerrain('Industrial', gridSize, [], createRng(1));
    const b = generateTerrain('Industrial', gridSize, [], createRng(2));
    expect(stripIds(a.terrain)).not.toEqual(stripIds(b.terrain));
  });

  it('world trait crystals adds Crystal pieces', () => {
    const { terrain } = generateTerrain('Wilderness', gridSize, [
      { id: 'crystals', name: 'Crystals', description: '' } as any
    ], createRng(4242));
    const crystals = terrain.filter(t => t.name === 'Crystal');
    expect(crystals.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run new unit tests**

```bash
npx vitest run services/terrainGenerator.test.ts
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add services/terrainGenerator.test.ts
git commit -m "test(rules): add unit tests for zone-based terrain generation"
```

---

## Task 8: Update Parity Test Snapshots

**Files:**
- Modify: `tests/scenarios/parity/enginev2_terrain_generation_parity.test.ts`

**Context:** The zone-based generator produces different layouts than quarter-based, so snapshots need updating.

- [ ] **Step 1: Run parity tests with update flag**

```bash
npx vitest run tests/scenarios/parity/enginev2_terrain_generation_parity.test.ts --update
```

Or if Vitest version doesn't support `--update` flag:

```bash
npx vitest run tests/scenarios/parity/enginev2_terrain_generation_parity.test.ts
```

Then manually delete the old snapshot file and re-run.

- [ ] **Step 2: Verify snapshot file was created/updated**

Check that `tests/scenarios/parity/__snapshots__/enginev2_terrain_generation_parity.test.ts.snap` exists and contains signatures for all 4 themes.

- [ ] **Step 3: Run all parity tests to confirm they pass**

```bash
npx vitest run tests/scenarios/parity/enginev2_terrain_generation_parity.test.ts
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/scenarios/parity/__snapshots__/
git commit -m "test(parity): update terrain generation snapshots for zone-based layouts"
```

---

## Task 9: Final Verification

**Files:**
- All modified files

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass (or existing failures remain unchanged).

- [ ] **Step 2: Run linter**

```bash
npx eslint --fix services/terrainGenerator.ts services/terrainGenerator.test.ts types/
```

- [ ] **Step 3: Run prettier**

```bash
npx prettier --write services/terrainGenerator.ts services/terrainGenerator.test.ts types/
```

- [ ] **Step 4: Final commit if any formatting changes**

```bash
git add -A
git commit -m "style: apply linting and formatting to zone-based generator" || echo "No changes to commit"
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** All sections of the design spec are addressed:
  - Zone-based placement (Tasks 2-3) ✅
  - Tactical anchors (Task 5) ✅
  - Interactive environment (Task 6) ✅
  - Connectivity validation with repair (Task 4) ✅
  - Testing strategy (Tasks 7-8) ✅
- [ ] **Placeholder scan:** No TBD, TODO, or vague steps in plan ✅
- [ ] **Type consistency:** `TacticalZoneSpec`, `PlacedAnchor`, `TacticalAnchorType` used consistently ✅
- [ ] **No interface breaks:** `generateTerrain()` signature unchanged ✅
- [ ] **Determinism preserved:** Same seed logic intact, RNG cursor advanced properly ✅

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-04-30-zone-based-tactical-map-generation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
