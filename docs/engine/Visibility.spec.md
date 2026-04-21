# Specification: Deterministic Line of Sight (LoS)

**Goal**: Provide a pure, mathematical way to determine if one grid cell can "see" another, considering various terrain types.

---

## 1. Algorithm: Supercover Traversal
To ensure the engine is grid-agnostic but precise, we use a **Supercover Line Algorithm**. 
Unlike standard Bresenham, Supercover identifies **all** cells a thin line passes through, including those it only clips at the corner.

### Logic:
- Given `Origin(x1, y1)` and `Target(x2, y2)`.
- Step through cells from Origin to Target.
- If any intermediate cell contains "Blocking Terrain", LoS is `false`.

## 2. Terrain Blocking Rules
The following `TerrainType` (from `types/battle.ts`) block LoS:
- `Wall`: Always blocks.
- `Block`: Always blocks.
- `Interior`: Always blocks.
- `Door`: Blocks if `status === 'closed'`.

The following do **NOT** block LoS but may provide cover:
- `Obstacle` (Crates, Barrels)
- `Individual`
- `Area`
- `Field`

## 3. Corner Cases
- **Strict Mode**: If a ray passes exactly through a vertex (intersection of 4 cells) and two adjacent cells are blocking, LoS is blocked.
- **Edge Clipping**: If a ray clips a wall cell even by a fraction, LoS is blocked.

## 4. API Definition
```typescript
/**
 * Determines if there is a clear Line of Sight between two positions.
 * @param state - Current engine battle state.
 * @param origin - Position of the observer.
 * @param target - Position of the target.
 * @returns boolean - true if LoS is clear.
 */
export function hasLineOfSight(
    state: EngineBattleState, 
    origin: Position, 
    target: Position
): boolean;
```

---
## 5. Verification (Parity)
Must match V1 `gridUtils.hasLineOfSight` behavior for standard scenarios:
1. Clear line across open ground.
2. Horizontal/Vertical wall blocking.
3. Diagonal wall blocking.
4. Distance 0 (always visible).
