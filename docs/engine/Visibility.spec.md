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
Visibility is checked against each cell the ray passes through.

### Static Blocking
- `Wall`, `Block`, `Interior`: Always block LoS if the ray enters their bounds.

### Dynamic Blocking
- `Door`: Blocks LoS if `status === 'closed'`. Does NOT block if `status === 'open'`.

### Size & Bounds
- Terrain objects can occupy multiple cells. LoS must check the full rectangle defined by `position` and `size`.

### Area Terrain (Five Parsecs Rules)
- `Area` terrain (e.g., woods, smoke) does NOT block LoS completely but:
  - If the ray passes through more than 2" (2 cells) of Area Terrain, it is blocked. (Note: To be implemented in Stage 4.2 as part of shooting penalties/blocking).
  - For now, `Area` is treated as non-blocking for basic LoS checks.

---
## 3. Boundary & Edge Cases
- **Multi-cell check**: For every cell in the ray, we must check if any part of a blocking terrain overlaps that coordinate.
- **Open Doors**: A door at `{x: 5, y: 5}` with `status: 'open'` is ignored by the LoS ray.


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
