# Specification: Area of Effect (AoE) Weapons (Engine V2)

**Goal**: Implement deterministic logic for weapons that affect multiple grid cells and participants simultaneously.

---

## 1. Supported Types
1. **Grenades/Explosives**: Circular radius around a target point.
2. **Flamers/Templates**: (Future expansion) Cone or line-based area.

## 2. Explosion Logic (Circular AoE)
- **Targeting**: Player selects a target cell (not necessarily a participant).
- **Radius**: Defined by the weapon (Standard Grenade = 2").
- **Impact**: Every participant whose position is within the radius (Chebyshev or Euclidean distance, depending on rule audit) is affected.

## 3. Resolution Sequence
1. **Attack Roll**: Roll to see if the grenade hits the target cell.
2. **Scatter (Optional/Rule dependent)**: If miss, the grenade may scatter to a nearby cell (Deterministic using RNG).
3. **Damage Roll**: 
   - Perform a separate damage roll for **each** participant in the AoE.
   - Purity constraint: Consumes N d6 rolls from `RngState`, where N is the number of targets.

## 4. Engine Primitives
### New Action: `THROW_GRENADE`
```typescript
{
    type: 'THROW_GRENADE',
    actorId: string,
    targetPos: Position,
    weaponId: string
}
```

### New Events:
- `AOE_IMPACT_DECLARED`: Area defined.
- `AOE_PARTICIPANT_HIT`: Individual result for each target in the blast.

---

## 5. Determinism & Multi-target
To maintain sync in multiplayer, targets must be processed in a stable order:
1. Identify all participants in radius.
2. Sort participants by ID (`localeCompare`).
3. Process Damage/Stun for each in that specific order.

## 6. Verification Scenarios
- **Scenario 1**: Grenade thrown at a cluster of 3 enemies. All 3 must be processed deterministically.
- **Scenario 2**: Grenade misses and scatters to an empty cell.
