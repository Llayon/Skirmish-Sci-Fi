# Design: Zone-Based Tactical Map Generation

**Date:** 2026-04-30  
**Status:** Draft — pending review  
**Scope:** General tactical map generation (mission-agnostic foundation)

---

## 1. Problem Statement

The current terrain generator (`services/terrainGenerator.ts`) divides the 32×32 grid into 4 spatial quarters and places features randomly within them. This produces maps that:
- Lack guaranteed tactical structure (no flanking routes, unpredictable cover density)
- Feel "samey" across themes because quarters have no combat purpose
- May create degenerate layouts (dead ends, impossible missions, no elevation)
- Do not leverage the existing interactive elements (doors, `isInteractive`)

**Goal:** Every generated map must have:
- At least 2 viable paths between deployment edges
- Meaningful cover distribution (clustered, not uniform)
- At least 1 elevation advantage point
- 1-3 natural chokepoints
- Optional: interactive environmental props

---

## 2. High-Level Approach

**Zone-Based Tactical Generation** replaces spatial quarters with **functional tactical zones**, each annotated with combat requirements. Theme-specific terrain generators fill zones while respecting specs.

Additionally, we introduce:
- **Tactical Anchors** — 2-3 key points that draw combat toward them
- **Interactive Environment** — build on existing `isInteractive` to add explosive barrels, hackable turrets, and lockable doors

This is **not** a full rewrite. The existing `featureGenerators`, `createBuilding()`, and RNG system remain. Only the placement strategy changes.

---

## 3. Tactical Zone System

### 3.1 Zone Layout

For a standard 32×32 map, zones are:

| Zone | Bounds | Purpose | Cover Target |
|------|--------|---------|--------------|
| `player_edge` | y: 30-31, x: 0-31 | Safe deployment | 0-5% (open) |
| `enemy_edge` | y: 0-1, x: 0-31 | Enemy deployment | 0-5% (open) |
| `central_arena` | x: 10-22, y: 10-22 | Main combat theater | 40-60% dense |
| `north_flank` | x: 0-9, y: 8-24 | Left alternative route | 20-35% medium |
| `south_flank` | x: 23-31, y: 8-24 | Right alternative route | 20-35% medium |
| `chokepoints` | On zone borders | Movement control | N/A (gaps) |

**Dynamic sizing:** For different grid sizes, zones scale proportionally. Minimum map size: 24×24.

### 3.2 Zone Specification

```typescript
interface TacticalZoneSpec {
  id: string;
  bounds: { x: number; y: number; width: number; height: number };
  requirements: {
    minCoverCells: number;      // cells occupied by terrain with providesCover=true
    maxCoverCells: number;      // upper limit to prevent solid walls
    needsElevation: boolean;    // must place hill/building
    minPathsTo: string[];       // zones that must be reachable
    chokepointCount: number;    // chokepoints on this zone's borders
    anchorChance: number;       // 0-1, chance to place a Tactical Anchor
  };
  themeWeights: Partial<Record<FeatureType, number>>; // bias for this zone
}
```

**Example `central_arena` spec:**
```typescript
{
  id: 'central_arena',
  bounds: { x: 10, y: 10, width: 13, height: 13 },
  requirements: {
    minCoverCells: 25,          // ~30% of 169 cells
    maxCoverCells: 50,          // ~60%
    needsElevation: true,
    minPathsTo: ['north_flank', 'south_flank', 'player_edge', 'enemy_edge'],
    chokepointCount: 0,
    anchorChance: 0.7
  },
  themeWeights: { building: 2, hill: 2, large_structure: 3 }
}
```

### 3.3 Zone Placement Algorithm

Replaces the current Step 1 (quarter division):

```
1. Create zones based on gridSize using ZONE_TEMPLATES
2. For each zone:
   a. Determine required cover cell count (rng between min/max)
   b. If needsElevation: place 1 notable feature (building/hill) first
   c. Fill remaining cover quota with regular features from themeWeights
   d. Ensure objects fit inside zone bounds (findFreeSpot with zone rect)
3. Create chokepoints on zone borders where required
4. Validate connectivity (A* from player_edge to enemy_edge via flanks)
5. If validation fails:
   a. Try to repair (add passage/gap in blocking terrain on border)
   b. If repair fails: regenerate entire map from step 1 (up to 5 attempts total)
6. Place scatter objects in remaining free cells (respecting maxCover)
```

**Key constraint:** `findFreeSpot` now receives the zone's `bounds` as the search rect, not the full grid or quarter.

---

## 4. Tactical Anchors

### 4.1 Definition

A **Tactical Anchor** is a deliberately placed feature that acts as a "gravity well" for combat:

| Anchor Type | Terrain | Tactical Effect | Theme Examples |
|-------------|---------|-----------------|----------------|
| `sniper_nest` | Elevated position + low cover | Height advantage, vulnerable to flanking | Roof with partial walls |
| `objective_point` | Central structure with cover | Natural point of contention | Generator, command console |
| `choke_anchor` | Narrow passage + cover on sides | Forces commitment | Bridge, gate, alley |
| `danger_zone` | Explosive barrels + open ground | Risk/reward positioning | Fuel depot |

### 4.2 Placement Rules

- Exactly **2-3 anchors per map** (configurable via `MAX_ANCHORS` constant)
- At least 1 anchor in `central_arena`, others distributed across flanks
- Anchors must be at least 8 cells apart (Chebyshev distance)
- Anchors do not replace zone specs — they are additional constraints

### 4.3 Integration with Existing Generator

Anchors map directly to existing features:
- `sniper_nest` → `createBuilding()` with small footprint + roof at edge
- `objective_point` → `createBuilding()` with door on multiple sides
- `choke_anchor` → Linear obstacle placed on zone border
- `danger_zone` → Scatter barrels + open area (see Interactive Environment)

---

## 5. Interactive Environment

### 5.1 New Interactive Types

Extend the existing `isInteractive` system:

```typescript
interface InteractiveTerrain extends Terrain {
  isInteractive: true;
  interactionType: 'door' | 'explosive_barrel' | 'hackable_turret' | 'lockable_door';
  // Type-specific data
  health?: number;           // for explosives
  explosionRadius?: number;  // for explosives
  explosionDamage?: number;  // for explosives
  faction?: 'player' | 'enemy' | 'neutral'; // for turrets
}
```

### 5.2 Placement Rules

| Type | Placement | Frequency |
|------|-----------|-----------|
| `explosive_barrel` | Near chokepoints, near flanking routes | 1-3 per map |
| `hackable_turret` | Elevated positions, near objective points | 0-1 per map |
| `lockable_door` | Building entrances, chokepoint passages | 1-2 per map |

**Constraint:** Interactive objects must not block the only path between zones.

### 5.3 Gameplay Effects

- **Explosive barrel:** When damaged (shoot action), triggers AoE damage in radius
- **Hackable turret:** `INTERACT` action by player converts it to allied unit for N turns
- **Lockable door:** `INTERACT` to toggle open/closed; affects pathfinding and LoS

---

## 6. Connectivity Validation

### 6.1 Algorithm

After terrain placement, validate:

```typescript
function validateMapConnectivity(
  terrain: Terrain[],
  zones: TacticalZone[],
  gridSize: { width: number; height: number }
): { valid: boolean; repairs: Terrain[] } {
  // Check A* path from player_edge center to enemy_edge center
  const mainPath = aStarPath(playerEdgeCenter, enemyEdgeCenter, terrain, gridSize);
  
  // Check flank paths exist
  const northFlankPath = aStarPath(playerEdgeLeft, enemyEdgeLeft, terrain, gridSize);
  const southFlankPath = aStarPath(playerEdgeRight, enemyEdgeRight, terrain, gridSize);
  
  const valid = mainPath.length > 0 && (northFlankPath.length > 0 || southFlankPath.length > 0);
  
  // Generate repair terrain if needed (gaps in walls)
  const repairs = valid ? [] : generatePassages(terrain, zones);
  
  return { valid, repairs };
}
```

### 6.2 Repair Strategy

If path blocked:
1. Identify blocking terrain on shortest path between zones
2. If blocking terrain is a wall (`isImpassable`): replace wall terrain piece with a Door terrain piece (passable, interactive)
3. If blocking terrain is a building: add a Door terrain piece on the border-facing wall
4. If still blocked: remove 1-cell segment of fence/linear obstacle (delete terrain piece at that position)
5. **Never remove** the central notable feature — work around it

---

## 7. Integration with Existing Code

### 7.1 Files to Modify

| File | Change |
|------|--------|
| `services/terrainGenerator.ts` | Replace quarter logic with zone system; add anchor placement; add connectivity validation |
| `services/engine/battle/actions/generateTerrain.ts` | No changes (interface unchanged) |
| `constants/terrain.ts` | Add zone specs per theme? Or keep zone-agnostic? |
| `types/index.ts` | Add `InteractionType`, `TacticalAnchorType` |

### 7.2 Preserved Behavior

- RNG determinism: same seed → same map
- `generateTerrain(theme, gridSize, worldTraits, rngState)` signature unchanged
- All existing feature generators (`featureGenerators` record) reused
- `createBuilding()`, `createTerrain()`, `findFreeSpot()` reused

### 7.3 New Exports

```typescript
// services/terrainGenerator.ts
export const ZONE_TEMPLATES: Record<string, TacticalZoneSpec[]>;
export const TACTICAL_ANCHOR_TYPES: TacticalAnchorType[];
export function validateMapConnectivity(/* ... */): ValidationResult;
```

---

## 8. Testing Strategy

### 8.1 New Tests to Add

| Test | Location | Purpose |
|------|----------|---------|
| Zone bounds respected | `terrainGenerator.test.ts` | No terrain exceeds zone rect |
| Cover density per zone | `terrainGenerator.test.ts` | minCover ≤ actual ≤ maxCover |
| Connectivity guarantee | `terrainGenerator.test.ts` | Every map has ≥2 paths |
| Anchor placement | `terrainGenerator.test.ts` | 2-3 anchors, min distance 8 |
| Elevation presence | `terrainGenerator.test.ts` | At least 1 elevated position |
| Interactive objects | `terrainGenerator.test.ts` | Barrels/turrets only on valid cells |
| Determinism preserved | `enginev2_terrain_generation_parity.test.ts` | Same seed = same map (update snapshot) |

### 8.2 Snapshot Update

The existing parity test snapshot will change because zone-based generation produces different layouts than quarter-based. Update snapshot after implementation and verify structural invariants still hold.

---

## 9. Mission-Aware Foundation (Future)

This design intentionally avoids mission-specific logic to stay focused. However, the zone system is architected for future extension:

```typescript
// Future: mission-specific zone overrides
const MISSION_ZONE_OVERRIDES: Record<MissionType, Partial<TacticalZoneSpec>[]> = {
  'Protect': [
    { id: 'central_arena', requirements: { minCoverCells: 40, anchorChance: 1.0 } }
  ],
  'Eliminate': [
    { id: 'north_flank', requirements: { minPathsTo: ['enemy_edge', 'central_arena'] } }
  ]
};
```

This is **not** in scope for this iteration.

---

## 10. Open Questions

1. **Should zone bounds be configurable per theme?** (e.g., Wilderness has wider flanks than Industrial)
2. **How to handle small grid sizes (< 24×24)?** Disable flanks? Reduce anchor count?
3. **Should interactive objects affect the parity test snapshot?** (They add new terrain types)

---

## Approval Checklist

- [ ] Zone layout and bounds look correct
- [ ] Tactical anchor types cover combat needs
- [ ] Interactive environment scope is appropriate (not too ambitious)
- [ ] Connectivity validation + repair strategy is acceptable
- [ ] Testing strategy is sufficient
- [ ] Mission-aware foundation direction is correct

**Next step after approval:** Invoke `writing-plans` skill to create implementation plan.
