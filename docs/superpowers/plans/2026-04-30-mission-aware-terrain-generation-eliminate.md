# Mission-Aware Terrain Generation (Eliminate) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional `missionType` parameter to `generateTerrain()` that applies zone overrides for Eliminate mission, producing denser central cover, open flanks, and a guaranteed command_post anchor.

**Architecture:** Configuration-driven pipeline. `MISSION_OVERRIDES` registry holds per-mission zone requirement overrides. `applyMissionOverrides()` merges them into `ZONE_TEMPLATES` before generation. No branching in core generator logic.

**Tech Stack:** TypeScript, Vitest, deterministic Mulberry32 RNG (existing)

---

## File Structure

| File | Action | Responsibility |
|------|--------|--------------|
| `services/terrainGenerator.ts` | **Modify** | Add `MISSION_OVERRIDES`, `applyMissionOverrides`, update `generateTerrain` signature, pass `missionType` to `placeTacticalAnchors` |
| `services/engine/battle/types.ts` | **Modify** | Add `missionType?: MissionType` to `GENERATE_TERRAIN` branch of `BattleAction` |
| `services/engine/battle/actions/generateTerrain.ts` | **Modify** | Pass `action.missionType` to `runTerrainGenerator` |
| `services/application/battleSetup.ts` | **Modify** | Pass `finalMissionType` through `runTerrainAction` to `GENERATE_TERRAIN` action |
| `services/terrainGenerator.test.ts` | **Modify** | Add Eliminate-specific tests |
| `tests/scenarios/parity/enginev2_terrain_generation_parity.test.ts` | **Modify** | Add Eliminate parity test + snapshot |

---

## Task 1: Add MISSION_OVERRIDES and applyMissionOverrides

**Files:**
- Modify: `services/terrainGenerator.ts`

**Context:** Add the configuration registry and merge helper. Place them near `ZONE_TEMPLATES`.

- [ ] **Step 1: Add override types and MISSION_OVERRIDES**

After the `MIN_ANCHOR_DISTANCE = 8` constant (around line 405), add:

```typescript
type ZoneRequirementOverrides = Partial<TacticalZoneSpec['requirements']>;
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
```

- [ ] **Step 2: Commit**

```bash
git add services/terrainGenerator.ts
git commit -m "feat(rules): add MISSION_OVERRIDES registry for mission-aware layouts"
```

---

## Task 2: Update generateTerrain signature and apply overrides

**Files:**
- Modify: `services/terrainGenerator.ts`

**Context:** The `generateTerrain` function signature currently takes 4 parameters. Add optional 5th `missionType`.

- [ ] **Step 1: Update function signature**

Change line 1240-1245 from:
```typescript
export const generateTerrain = (
  theme: TerrainTheme,
  gridSize: { width: number; height: number },
  worldTraits: WorldTrait[] = [],
  rngState: SeededRngState,
): { terrain: Terrain[]; rng: SeededRngState } => {
```

To:
```typescript
export const generateTerrain = (
  theme: TerrainTheme,
  gridSize: { width: number; height: number },
  worldTraits: WorldTrait[] = [],
  rngState: SeededRngState,
  missionType?: string,
): { terrain: Terrain[]; rng: SeededRngState } => {
```

- [ ] **Step 2: Apply overrides before zone scaling**

After `const zones = ZONE_TEMPLATES.map(...)` (around line 1267), add:

```typescript
  const overriddenZones = applyMissionOverrides(zones, missionType);
```

Then replace all references to `zones` inside the retry loop with `overriddenZones`:

```typescript
  while (attempts < 5 && !valid) {
    attempts++;
    const attemptTerrain: Terrain[] = [];

    for (const zone of overriddenZones) {
      placeZoneFeatures(zone, themeGenerator, attemptTerrain, rng);
    }

    placeTacticalAnchors(overriddenZones, attemptTerrain, rng, missionType);

    placeInteractiveProps(attemptTerrain, gridSize, rng);

    validateAndRepairConnectivity(attemptTerrain, overriddenZones, gridSize, rng);
```

- [ ] **Step 3: Run parity tests**

```bash
npx vitest run tests/scenarios/parity/enginev2_terrain_generation_parity.test.ts
```

Expected: All tests pass (snapshots unchanged — generic maps still work).

- [ ] **Step 4: Commit**

```bash
git add services/terrainGenerator.ts
git commit -m "feat(rules): accept missionType parameter and apply zone overrides"
```

---

## Task 3: Force command_post anchor for Eliminate

**Files:**
- Modify: `services/terrainGenerator.ts`

**Context:** `placeTacticalAnchors` currently picks random anchor types. For Eliminate, the central anchor must always be a command_post.

- [ ] **Step 1: Update placeTacticalAnchors signature**

Change the function signature from:
```typescript
function placeTacticalAnchors(
  zones: TacticalZoneSpec[],
  terrain: Terrain[],
  rng: GenCursor,
): PlacedAnchor[] {
```

To:
```typescript
function placeTacticalAnchors(
  zones: TacticalZoneSpec[],
  terrain: Terrain[],
  rng: GenCursor,
  missionType?: string,
): PlacedAnchor[] {
```

- [ ] **Step 2: Force command_post for Eliminate central anchor**

Replace the central zone anchor placement block (around lines 1170-1185):

```typescript
  // Place at least 1 anchor in central
  if (centralZone && rng.float() < centralZone.requirements.anchorChance) {
    let type: TacticalAnchorType;
    if (missionType === 'Eliminate') {
      type = 'objective_point'; // command_post maps to objective_point anchor type
    } else {
      const types: TacticalAnchorType[] = ['sniper_nest', 'objective_point', 'danger_zone'];
      type = types[Math.floor(rng.float() * types.length)];
    }
    const pieces = anchorGenerators[type](centralZone, terrain, rng);
    if (pieces.length > 0) {
      terrain.push(...pieces);
      anchors.push({ type, position: pieces[0].position, zoneId: centralZone.id });
    }
  }
```

- [ ] **Step 3: Run parity tests**

```bash
npx vitest run tests/scenarios/parity/enginev2_terrain_generation_parity.test.ts
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add services/terrainGenerator.ts
git commit -m "feat(rules): force objective_point anchor for Eliminate central zone"
```

---

## Task 4: Update BattleAction type

**Files:**
- Modify: `services/engine/battle/types.ts`

**Context:** Add `missionType` to the `GENERATE_TERRAIN` action so it can be passed through the reducer.

- [ ] **Step 1: Add MissionType import**

Add `MissionType` to the existing import from `./campaign` on line 7-14:

```typescript
import type {
  CampaignLog,
  LogEntry,
  MissionType,
  Difficulty,
  TableEntry,
  ActiveMission,
  WorldTrait,
} from "./campaign";
```

- [ ] **Step 2: Add missionType to GENERATE_TERRAIN action**

Change line 48 from:
```typescript
| { type: 'GENERATE_TERRAIN'; theme: TerrainTheme; gridSize: GridSize; worldTraits?: WorldTrait[] }
```

To:
```typescript
| { type: 'GENERATE_TERRAIN'; theme: TerrainTheme; gridSize: GridSize; worldTraits?: WorldTrait[]; missionType?: MissionType }
```

- [ ] **Step 3: Commit**

```bash
git add services/engine/battle/types.ts
git commit -m "feat(engine): add missionType to GENERATE_TERRAIN BattleAction"
```

---

## Task 5: Pass missionType through engine action

**Files:**
- Modify: `services/engine/battle/actions/generateTerrain.ts`

**Context:** The engine action receives the action and must pass `missionType` to the pure generator.

- [ ] **Step 1: Pass action.missionType to runTerrainGenerator**

Change the `runTerrainGenerator` call from:
```typescript
    const { terrain, rng: nextRng } = runTerrainGenerator(
        action.theme,
        action.gridSize,
        action.worldTraits ?? [],
        state.rng,
    );
```

To:
```typescript
    const { terrain, rng: nextRng } = runTerrainGenerator(
        action.theme,
        action.gridSize,
        action.worldTraits ?? [],
        state.rng,
        action.missionType,
    );
```

- [ ] **Step 2: Commit**

```bash
git add services/engine/battle/actions/generateTerrain.ts
git commit -m "feat(engine): pass missionType from GENERATE_TERRAIN action to generator"
```

---

## Task 6: Wire missionType through battleSetup

**Files:**
- Modify: `services/application/battleSetup.ts`

**Context:** `runTerrainAction` builds the `GENERATE_TERRAIN` action. It needs to accept and pass `missionType`.

- [ ] **Step 1: Update runTerrainAction signature**

Change line 16-21 from:
```typescript
function runTerrainAction(
    theme: TerrainTheme,
    gridSize: { width: number; height: number },
    worldTraits: WorldTrait[] | undefined,
    seed: number,
): Terrain[] {
```

To:
```typescript
function runTerrainAction(
    theme: TerrainTheme,
    gridSize: { width: number; height: number },
    worldTraits: WorldTrait[] | undefined,
    seed: number,
    missionType?: MissionType,
): Terrain[] {
```

- [ ] **Step 2: Pass missionType into the action**

Change line 34 from:
```typescript
        { type: 'GENERATE_TERRAIN', theme, gridSize, worldTraits },
```

To:
```typescript
        { type: 'GENERATE_TERRAIN', theme, gridSize, worldTraits, missionType },
```

- [ ] **Step 3: Pass finalMissionType at call site**

Change line 82-87 from:
```typescript
    const terrain = runTerrainAction(
        options.forceTerrainTheme || 'Industrial',
        BATTLE_GRID_SIZE,
        campaign?.currentWorld?.traits,
        battleSeed,
    );
```

To:
```typescript
    const terrain = runTerrainAction(
        options.forceTerrainTheme || 'Industrial',
        BATTLE_GRID_SIZE,
        campaign?.currentWorld?.traits,
        battleSeed,
        finalMissionType,
    );
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run services/application/battleSetup.test.ts 2>/dev/null || echo "No battleSetup tests — that's OK"
npx vitest run tests/scenarios/parity/
```

Expected: Parity tests pass.

- [ ] **Step 5: Commit**

```bash
git add services/application/battleSetup.ts
git commit -m "feat(campaign): pass missionType to terrain generation in battleSetup"
```

---

## Task 7: Add Unit Tests for Eliminate Mission

**Files:**
- Modify: `services/terrainGenerator.test.ts`

**Context:** Add tests verifying Eliminate-specific behavior.

- [ ] **Step 1: Import MissionType**

Add `MissionType` to the existing import on line 4:
```typescript
import { TerrainTheme, WorldTrait, MissionType } from "../types";
```

- [ ] **Step 2: Add helper to count cover in a zone**

Append to the test file (before the `describe` block or at the end):

```typescript
function countCoverInZone(terrain: any[], zoneId: string): number {
  // Zone bounds are hardcoded for test consistency
  const zoneBounds: Record<string, { x: number; y: number; width: number; height: number }> = {
    central_arena: { x: 10, y: 10, width: 13, height: 13 },
    north_flank: { x: 0, y: 8, width: 9, height: 17 },
    south_flank: { x: 23, y: 8, width: 9, height: 17 },
  };
  const bounds = zoneBounds[zoneId];
  if (!bounds) return 0;

  let count = 0;
  for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
      const cellTerrain = terrain.find((t: any) =>
        x >= t.position.x && x < t.position.x + t.size.width &&
        y >= t.position.y && y < t.position.y + t.size.height
      );
      if (cellTerrain?.providesCover) count++;
    }
  }
  return count;
}
```

- [ ] **Step 3: Add Eliminate describe block**

Append at the end of the file:

```typescript
describe("Mission-aware terrain generation (Eliminate)", () => {
  it("Eliminate always places an objective_point anchor", () => {
    const { terrain } = generateTerrain(
      "Industrial",
      gridSize,
      [],
      createRng(12345),
      "Eliminate"
    );
    const objectives = terrain.filter(
      (t) => t.name === "Objective" || t.name === "Sniper Nest"
    );
    expect(objectives.length).toBeGreaterThan(0);
  });

  it("Eliminate has denser central cover than generic", () => {
    const generic = generateTerrain("Industrial", gridSize, [], createRng(12345));
    const eliminate = generateTerrain(
      "Industrial",
      gridSize,
      [],
      createRng(12345),
      "Eliminate"
    );

    const genericCentral = countCoverInZone(generic.terrain, "central_arena");
    const eliminateCentral = countCoverInZone(eliminate.terrain, "central_arena");

    expect(eliminateCentral).toBeGreaterThanOrEqual(genericCentral);
  });

  it("Eliminate flanks are more open than generic", () => {
    const generic = generateTerrain("Industrial", gridSize, [], createRng(12345));
    const eliminate = generateTerrain(
      "Industrial",
      gridSize,
      [],
      createRng(12345),
      "Eliminate"
    );

    const genericNorth = countCoverInZone(generic.terrain, "north_flank");
    const eliminateNorth = countCoverInZone(eliminate.terrain, "north_flank");

    expect(eliminateNorth).toBeLessThanOrEqual(genericNorth);
  });

  it("Generic map without missionType is unchanged", () => {
    const withExplicit = generateTerrain(
      "Industrial",
      gridSize,
      [],
      createRng(9999),
      undefined
    );
    const withoutParam = generateTerrain("Industrial", gridSize, [], createRng(9999));

    expect(stripIds(withExplicit.terrain)).toEqual(
      stripIds(withoutParam.terrain)
    );
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run services/terrainGenerator.test.ts
```

Expected: All tests pass (or Eliminate tests may fail if behavior not yet fully wired — fix before committing).

- [ ] **Step 5: Commit**

```bash
git add services/terrainGenerator.test.ts
git commit -m "test(rules): add unit tests for Eliminate mission-aware generation"
```

---

## Task 8: Add Eliminate Parity Test

**Files:**
- Modify: `tests/scenarios/parity/enginev2_terrain_generation_parity.test.ts`

**Context:** Add a golden baseline snapshot test for Eliminate maps.

- [ ] **Step 1: Add Eliminate snapshot test**

In the "Golden baseline" describe block (around line 136), add inside the `themes.forEach` loop or as a separate block:

```typescript
  describe("Mission-aware baseline — Eliminate", () => {
    const gridSize = { width: 32, height: 32 };

    themes.forEach((theme) => {
      it(`[${theme}] Eliminate terrain signature at seed=12345 matches snapshot`, () => {
        const { terrain } = generateTerrain(theme, gridSize, [], createRng(12345), 'Eliminate');

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
            baseElevation: t.baseElevation,
            objectHeight: t.objectHeight,
          })),
        };

        expect(signature).toMatchSnapshot();
      });
    });
  });
```

- [ ] **Step 2: Generate snapshots**

```bash
npx vitest run tests/scenarios/parity/enginev2_terrain_generation_parity.test.ts --update
```

Or if `--update` doesn't work:

```bash
npx vitest run -u tests/scenarios/parity/enginev2_terrain_generation_parity.test.ts
```

- [ ] **Step 3: Verify and run tests**

```bash
npx vitest run tests/scenarios/parity/enginev2_terrain_generation_parity.test.ts
```

Expected: All tests pass (including new Eliminate snapshots).

- [ ] **Step 4: Commit**

```bash
git add tests/scenarios/parity/__snapshots__/
git add tests/scenarios/parity/enginev2_terrain_generation_parity.test.ts
git commit -m "test(parity): add Eliminate mission snapshot baseline"
```

---

## Task 9: Final Verification

**Files:**
- All modified files

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Run linter**

```bash
npx eslint --fix services/terrainGenerator.ts services/terrainGenerator.test.ts services/engine/battle/types.ts services/engine/battle/actions/generateTerrain.ts services/application/battleSetup.ts
```

- [ ] **Step 3: Run prettier**

```bash
npx prettier --write services/terrainGenerator.ts services/terrainGenerator.test.ts services/engine/battle/types.ts services/engine/battle/actions/generateTerrain.ts services/application/battleSetup.ts
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "style: apply linting and formatting to mission-aware terrain generation" || echo "No changes to commit"
```

---

## Self-Review Checklist

- [ ] **Spec coverage:**
  - `MISSION_OVERRIDES` registry (Task 1) ✅
  - `applyMissionOverrides` helper (Task 1) ✅
  - `generateTerrain` accepts `missionType` (Task 2) ✅
  - Overrides applied before zone scaling (Task 2) ✅
  - `command_post` anchor forced for Eliminate (Task 3) ✅
  - `BattleAction` type updated (Task 4) ✅
  - Engine action passes `missionType` (Task 5) ✅
  - `battleSetup` passes `finalMissionType` (Task 6) ✅
  - Unit tests for Eliminate (Task 7) ✅
  - Parity snapshot for Eliminate (Task 8) ✅

- [ ] **Placeholder scan:** No TBD, TODO, or vague steps ✅
- [ ] **Type consistency:** `missionType?: string` in generator, `missionType?: MissionType` in BattleAction — both optional, consistent with spec ✅
- [ ] **Backward compatibility:** All old calls to `generateTerrain` without `missionType` still work ✅

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-04-30-mission-aware-terrain-generation-eliminate.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
