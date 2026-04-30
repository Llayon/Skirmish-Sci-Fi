# Mission-Aware Terrain Generation (Protect) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `Protect` mission configuration with VIP escort layout (evacuation point on player_edge, open flanks, dense central route).

**Architecture:** Same configuration-driven pipeline as Eliminate. Add `Protect` entry to `MISSION_OVERRIDES`. Add `evacuation_point` anchor on `player_edge`.

**Tech Stack:** TypeScript, Vitest

---

## File Structure

| File | Action | Responsibility |
|------|--------|--------------|
| `services/terrainGenerator.ts` | **Modify** | Add `Protect` to `MISSION_OVERRIDES`, add `evacuation_point` anchor logic |
| `services/terrainGenerator.test.ts` | **Modify** | Add Protect-specific tests |
| `tests/scenarios/parity/enginev2_terrain_generation_parity.test.ts` | **Modify** | Add Protect snapshot baseline |

---

## Task 1: Add Protect to MISSION_OVERRIDES

**Files:**
- Modify: `services/terrainGenerator.ts`

- [ ] **Step 1: Add Protect entry**

In `MISSION_OVERRIDES`, add after `Eliminate`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add services/terrainGenerator.ts
git commit -m "feat(rules): add Protect mission zone overrides"
```

---

## Task 2: Add evacuation_point anchor for Protect

**Files:**
- Modify: `services/terrainGenerator.ts`

- [ ] **Step 1: Add evacuation_point anchor type**

In `anchorGenerators` (inside `placeTacticalAnchors`), add:

```typescript
    evacuation_point: (zone, existing, rng) => {
      const size = { width: 4, height: 4 };
      const pos = findFreeSpot(zone.bounds, size, existing, rng);
      if (!pos) return [];
      return [
        createTerrain(rng, 'Evacuation Point', 'Area', pos, size, { providesCover: true, blocksLineOfSight: false, isImpassable: false, baseElevation: 1, objectHeight: 0 }),
      ];
    },
```

- [ ] **Step 2: Force evacuation_point on player_edge for Protect**

In the flank loop (after central anchor placement), add:

```typescript
  // Place evacuation point on player_edge for Protect
  if (missionType === 'Protect') {
    const playerZone = zones.find(z => z.id === 'player_edge');
    if (playerZone) {
      const pieces = anchorGenerators['evacuation_point'](playerZone, terrain, rng);
      if (pieces.length > 0) {
        terrain.push(...pieces);
        anchors.push({ type: 'evacuation_point' as TacticalAnchorType, position: pieces[0].position, zoneId: playerZone.id });
      }
    }
  }
```

**Note:** Need to add `evacuation_point` to `TacticalAnchorType` in `types/index.ts`:

```typescript
export type TacticalAnchorType = 'sniper_nest' | 'objective_point' | 'choke_anchor' | 'danger_zone' | 'evacuation_point';
```

- [ ] **Step 3: Commit**

```bash
git add services/terrainGenerator.ts types/index.ts
git commit -m "feat(rules): add evacuation_point anchor for Protect mission"
```

---

## Task 3: Add Unit Tests for Protect

**Files:**
- Modify: `services/terrainGenerator.test.ts`

- [ ] **Step 1: Add Protect describe block**

Append at end of file:

```typescript
describe("Mission-aware terrain generation (Protect)", () => {
  it("Protect places evacuation point on player edge", () => {
    const { terrain } = generateTerrain(
      "Industrial",
      gridSize,
      [],
      createRng(12345),
      "Protect"
    );
    const evac = terrain.filter((t) => t.name.includes("Evacuation"));
    expect(evac.length).toBeGreaterThan(0);
  });

  it("Protect has denser player edge than generic", () => {
    const generic = generateTerrain("Industrial", gridSize, [], createRng(12345));
    const protect = generateTerrain(
      "Industrial",
      gridSize,
      [],
      createRng(12345),
      "Protect"
    );

    const genericPlayer = countCoverInZone(generic.terrain, "player_edge");
    const protectPlayer = countCoverInZone(protect.terrain, "player_edge");

    expect(protectPlayer).toBeGreaterThanOrEqual(genericPlayer);
  });

  it("Protect has open flanks for alternative routes", () => {
    const generic = generateTerrain("Industrial", gridSize, [], createRng(12345));
    const protect = generateTerrain(
      "Industrial",
      gridSize,
      [],
      createRng(12345),
      "Protect"
    );

    const genericNorth = countCoverInZone(generic.terrain, "north_flank");
    const protectNorth = countCoverInZone(protect.terrain, "north_flank");

    expect(protectNorth).toBeLessThanOrEqual(genericNorth);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run services/terrainGenerator.test.ts
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add services/terrainGenerator.test.ts
git commit -m "test(rules): add unit tests for Protect mission-aware generation"
```

---

## Task 4: Add Protect Parity Test

**Files:**
- Modify: `tests/scenarios/parity/enginev2_terrain_generation_parity.test.ts`

- [ ] **Step 1: Add Protect snapshot test**

Add alongside Eliminate block:

```typescript
  describe('Mission-aware baseline — Protect', () => {
    const gridSize = { width: 32, height: 32 };

    themes.forEach((theme) => {
      it(`[${theme}] Protect terrain signature at seed=12345 matches snapshot`, () => {
        const { terrain } = generateTerrain(theme, gridSize, [], createRng(12345), 'Protect');

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

- [ ] **Step 3: Run tests**

```bash
npx vitest run tests/scenarios/parity/enginev2_terrain_generation_parity.test.ts
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/scenarios/parity/__snapshots__/ tests/scenarios/parity/enginev2_terrain_generation_parity.test.ts
git commit -m "test(parity): add Protect mission snapshot baseline"
```

---

## Task 5: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

- [ ] **Step 2: Run linter and prettier**

```bash
npx eslint --fix services/terrainGenerator.ts services/terrainGenerator.test.ts types/index.ts
git commit -m "style: apply linting and formatting" || echo "No changes"
```

---

## Execution Options

**Plan complete. Two options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task

**2. Inline Execution** — Execute tasks in this session

**Which approach?**
