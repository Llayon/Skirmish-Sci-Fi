# Design: Mission-Aware Terrain Generation (Eliminate)

**Date:** 2026-04-30  
**Status:** Draft — pending review  
**Scope:** First mission-aware map layout — `Eliminate` mission type

---

## 1. Problem Statement

The zone-based tactical generator (completed in the previous iteration) produces generic maps suitable for any mission. However, different mission types require different tactical layouts:

- **`Eliminate`** — target must be in a defensible position with multiple approach routes
- **`Protect`** — VIP needs a fortified position with clear sight lines
- **`Defend`** — player needs strong forward positions with chokepoints
- etc.

**Goal:** `generateTerrain()` should accept an optional `missionType` parameter and adjust zone layouts accordingly, starting with `Eliminate`.

---

## 2. High-Level Approach

**Configuration-Driven Pipeline** — pure configuration overrides per mission type, no changes to core generation logic.

```
battleSetup → GENERATE_TERRAIN action → generateTerrain(theme, gridSize, worldTraits, rng, missionType)
                                              ↓
                                    Apply MISSION_OVERRIDES[missionType] to ZONE_TEMPLATES
                                              ↓
                                    Continue with existing zone-based generation
```

**Key principle:** New mission type = new configuration entry. No new functions, no branching logic in the generator.

---

## 3. Configuration Architecture

### 3.1 Override Types

```typescript
type ZoneRequirementOverrides = Partial<TacticalZoneSpec['requirements']>;
type ZoneOverrides = Partial<Record<string, ZoneRequirementOverrides>>;
```

### 3.2 Mission Overrides Registry

```typescript
const MISSION_OVERRIDES: Record<MissionType, ZoneOverrides> = {
  Eliminate: {
    central_arena: {
      minCoverCells: 35,      // was 25 — denser center for target defense
      maxCoverCells: 55,      // was 50
      anchorChance: 1.0,      // was 0.7 — guaranteed anchor
    },
    north_flank: {
      minCoverCells: 10,      // was 15 — more open flanks for approach
      maxCoverCells: 20,      // was 30
    },
    south_flank: {
      minCoverCells: 10,      // was 15
      maxCoverCells: 20,      // was 30
    },
  },
  // Future missions added here without touching generator code
};
```

### 3.3 Application Logic

```typescript
function applyMissionOverrides(
  zones: TacticalZoneSpec[],
  missionType?: MissionType,
): TacticalZoneSpec[] {
  if (!missionType) return zones;
  const overrides = MISSION_OVERRIDES[missionType];
  if (!overrides) return zones;

  return zones.map(zone => ({
    ...zone,
    requirements: {
      ...zone.requirements,
      ...overrides[zone.id],
    },
  }));
}
```

---

## 4. Eliminate-Specific Layout

### 4.1 Zone Changes

| Zone | Generic | Eliminate Override | Tactical Purpose |
|------|---------|-------------------|------------------|
| `central_arena` | 25-50 cover, 70% anchor | 35-55 cover, **100% anchor** | Target is heavily fortified |
| `north_flank` | 15-30 cover | **10-20 cover** | Open approach routes |
| `south_flank` | 15-30 cover | **10-20 cover** | Open approach routes |
| `player_edge` | 0-6 cover | (no change) | Safe deployment |
| `enemy_edge` | 0-6 cover | (no change) | Safe deployment |

### 4.2 Anchor Behavior for Eliminate

When `missionType === 'Eliminate'`, the central anchor is always `command_post` (instead of random choice between `sniper_nest`, `objective_point`, `danger_zone`):

```typescript
// In placeTacticalAnchors, when missionType is Eliminate:
if (missionType === 'Eliminate' && zone.id === 'central_arena') {
  // Force command_post anchor
  const pieces = anchorGenerators['command_post'](centralZone, terrain, rng);
}
```

**`command_post` anchor spec:**
- Building 4×4 with doors on all 4 sides (not random side)
- Extra barricades/containers nearby (placed as part of anchor generation)
- Roof at `baseElevation: 2` for height advantage

### 4.3 Validation Rules

Additional checks for Eliminate maps:
- Central arena has ≥1 building with roof (`baseElevation > 0`)
- At least 2 viable paths from player edge to central arena
- At least 1 `command_post` anchor exists

---

## 5. Integration Points

### 5.1 Files to Modify

| File | Change |
|------|--------|
| `services/terrainGenerator.ts` | Add `MISSION_OVERRIDES`, `applyMissionOverrides`, accept `missionType` parameter |
| `types/battle.ts` | Add `missionType?: MissionType` to `BattleAction` union (GENERATE_TERRAIN branch) |
| `services/engine/battle/actions/generateTerrain.ts` | Pass `action.missionType` to `runTerrainGenerator` |
| `services/application/battleSetup.ts` | Pass `finalMissionType` to `runTerrainAction` |

### 5.2 Preserved Behavior

- `generateTerrain()` signature is backward-compatible (`missionType` is optional)
- All existing calls without `missionType` produce identical results
- RNG determinism unchanged
- Zone-based generation, connectivity validation, anchors, interactive props — all untouched

---

## 6. Testing Strategy

### 6.1 New Tests

| Test | Location | Purpose |
|------|----------|---------|
| Eliminate has command_post anchor | `services/terrainGenerator.test.ts` | Guaranteed anchor for Eliminate |
| Eliminate central arena has more cover | `services/terrainGenerator.test.ts` | Override applied |
| Eliminate flanks are more open | `services/terrainGenerator.test.ts` | Flank overrides applied |
| Generic map without missionType unchanged | `services/terrainGenerator.test.ts` | Backward compatibility |
| Parity test for Eliminate | `tests/scenarios/parity/` | Snapshot baseline |

### 6.2 Test Example

```typescript
it('Eliminate always places a command_post anchor', () => {
  const { terrain } = generateTerrain('Industrial', gridSize, [], createRng(12345), 'Eliminate');
  const commandPosts = terrain.filter(t => t.name === 'Command Post' || t.name === 'Objective');
  expect(commandPosts.length).toBeGreaterThan(0);
});

it('Eliminate has denser central cover than generic', () => {
  const generic = generateTerrain('Industrial', gridSize, [], createRng(12345));
  const eliminate = generateTerrain('Industrial', gridSize, [], createRng(12345), 'Eliminate');
  
  const genericCentralCover = countCoverInZone(generic.terrain, 'central_arena');
  const eliminateCentralCover = countCoverInZone(eliminate.terrain, 'central_arena');
  
  expect(eliminateCentralCover).toBeGreaterThanOrEqual(genericCentralCover);
});
```

---

## 7. Future Extension Path

This architecture supports adding new mission types by adding entries to `MISSION_OVERRIDES`:

```typescript
const MISSION_OVERRIDES: Record<MissionType, ZoneOverrides> = {
  Eliminate: { /* ... */ },
  Protect: {
    central_arena: { minCoverCells: 45, maxCoverCells: 60, anchorChance: 1.0 },
    player_edge: { minCoverCells: 15, maxCoverCells: 25 },
  },
  Defend: {
    player_edge: { minCoverCells: 20, maxCoverCells: 35, needsElevation: true },
    north_flank: { minCoverCells: 25, maxCoverCells: 40 },
  },
  // etc.
};
```

No generator code changes needed for new missions.

---

## 8. Open Questions

1. **Should `themeWeights` also be overridable per mission?** Currently only `requirements` are overridden.
2. **Should anchor type forcing be in `MISSION_OVERRIDES` or hardcoded in `placeTacticalAnchors`?** The spec uses hardcoded logic for `command_post` — is this scalable?

---

## Approval Checklist

- [ ] Configuration-driven approach is acceptable
- [ ] Eliminate zone overrides look correct
- [ ] `command_post` anchor specification is sufficient
- [ ] Integration points cover all necessary files
- [ ] Testing strategy is adequate
- [ ] Future extension path is clear

**Next step after approval:** Invoke `writing-plans` skill to create implementation plan.
