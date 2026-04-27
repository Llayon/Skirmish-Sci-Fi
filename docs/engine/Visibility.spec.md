# Specification: Deterministic Line of Sight & Cover

**Goal:** Pure, height-aware LoS and Cover for Engine V2, faithful to the
Five Parsecs rulebook ("Lines of Sight", "Cover", "Shooting across
Linear Obstacles").

**Implemented in:** `services/engine/battle/rules/visibilityRules.ts`.
**Companion specs:** `Height_Mechanics.spec.md` for the elevation data
model and figure-Z computation that this spec consumes.

---

## 1. Ray Traversal

A **Supercover Line Algorithm** (`services/engine/utils/raycast.ts`)
walks every grid cell the line from origin to target passes through,
including corner-clipped cells. The ray includes both endpoints.

## 2. Line of Sight (`hasLineOfSight`)

LoS evaluation runs in three stages. Same-cell origin/target is always
visible.

### 2.1 Eye heights

`shooterZ = getFigureZ(state, origin)`,
`targetZ  = getFigureZ(state, target)` — see `Height_Mechanics.spec.md`.

### 2.2 Area-feature edge rule

Rulebook: "Line of Sight into an Area feature terminates at the nearest
edge." Two figures inside the same Area can see each other within 3"
(Chebyshev 3). Outside that:

- A target inside a concealing Area is visible only if the **first**
  ray cell contained in that Area is the target cell itself (i.e.
  target stands on the edge facing the firer).
- A shooter inside a concealing Area can see out only from the
  far-side edge (last ray cell in the Area must be the shooter cell).
- Areas on the ray that contain neither end do not block by this rule
  (they can still grant cover via `calculateCover`).

**What counts as a concealing Area:** `type === 'Area' &&
concealsLineOfSight === true`. The flag is opt-in and required —
roofs, hills, and landing pads share `type:'Area'` in data but
elevate rather than conceal, and so omit the flag. There is no
implicit fallback; a forest/swamp/jungle MUST declare the flag.

**Convex-AABB assumption:** the "first ray cell in Area" check is
correct only when the Area's footprint is convex. All current Area
pieces are rectangular AABBs by construction (`Terrain.size` is W×H).

### 2.3 LoS-blocking obstacles (height-aware)

For every intermediate ray cell that contains a `blocksLineOfSight`
terrain piece:

- Compute `top = obstacleTop(t) = losBlockerHeight ?? (baseElevation + objectHeight)`.
- Skip the obstacle when `shooterZ >= top || targetZ >= top` — either
  end sees over (rulebook: linear obstacles ignored when target
  entirely visible over them; symmetry for the rooftop case).
- Otherwise the ray is blocked.

**Door modeling (`losBlockerHeight`):** a closed door is
`isImpassable: false` (figures walk through when open),
`blocksLineOfSight: true` (opaque when closed),
`objectHeight: 0` (no physical thickness for movement) and
`losBlockerHeight: 2` (effective top for LoS). The override field
makes the model explicit and removes the prior `top===0 → ∞`
heuristic. Any future zero-thickness opaque marker (smoke, energy
field) declares its LoS height the same way.

## 3. Cover (`calculateCover`)

Encodes rulebook "Cover" sidebar:

1. **No LoS → no cover.**
2. **Target inside a `providesCover` terrain → cover**, *unless* the
   shooter is strictly above the cover piece's top (`shooterZ >
   coverTop`). A figure on a 2-tall roof firing down at a target
   inside a 1-tall hedge sees over the canopy — the step falls
   through to step 3 rather than granting cover. Two ground-level
   figures with the target inside the hedge keep cover (boundary
   `shooterZ <= top` is inclusive).
3. **Ray crosses a `providesCover` piece**, AND
   - `coverTop = baseElevation + objectHeight`, with shooter and
     target both **below** the cover top (otherwise: cover is
     useless), AND
   - the cover cell is **more than 1 grid cell** (Chebyshev > 1) from
     the firer (rulebook "more than 1" from the firer" — within 1, the
     firer leans over and shoots without granting cover).

Both `obstacleTop` and `coverTop` are now plain functions of the
explicit height fields — no zero-height heuristics remain. Pieces
that need to override the physical top for LoS purposes (doors etc.)
do so via `losBlockerHeight`.

## 4. API

```typescript
function hasLineOfSight(state: EngineBattleState, origin: Position, target: Position): boolean;
function calculateCover(state: EngineBattleState, attackerPos: Position, targetPos: Position): boolean;
```

Both are pure: deterministic in `(state, origin/attackerPos, target/targetPos)`.

## 5. Test Coverage

- `services/engine/battle/rules/visibilityRules.test.ts` — 21 tests
  spanning original V1 scenarios, height-aware LoS (roofs, hills,
  legacy LoS-blockers, doors), Cover with within-1 + height
  negation, and Area-feature edge rule (forest concealment, in-Area
  3" rule, pass-through neutrality).
