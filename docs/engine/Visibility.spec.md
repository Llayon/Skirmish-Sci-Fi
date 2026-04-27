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
concealsLineOfSight === true`. The flag is opt-in. Roofs, hills, and
landing pads share `type:'Area'` in data but elevate rather than
conceal, and so omit the flag.

**Heuristic fallback** (legacy fixtures pre-flag): an Area with
`providesCover === true && baseElevation === 0 && objectHeight === 0`
is treated as concealing. New code MUST set the flag explicitly; the
fallback exists only to keep old fixtures green.

**Convex-AABB assumption:** the "first ray cell in Area" check is
correct only when the Area's footprint is convex. All current Area
pieces are rectangular AABBs by construction (`Terrain.size` is W×H).

### 2.3 LoS-blocking obstacles (height-aware)

For every intermediate ray cell that contains a `blocksLineOfSight`
terrain piece:

- Compute `top = obstacleTop(t) = baseElevation + objectHeight`.
- Skip the obstacle when `shooterZ >= top || targetZ >= top` — either
  end sees over (rulebook: linear obstacles ignored when target
  entirely visible over them; symmetry for the rooftop case).
- Otherwise the ray is blocked.

**Door special case:** `obstacleTop` promotes any zero-height
LoS-blocker to `Number.POSITIVE_INFINITY`. A closed door is modeled
with `isImpassable: false, blocksLineOfSight: true, objectHeight: 0`
so figures can walk through it when open; the heuristic prevents that
data shape from accidentally turning the door transparent. *Tech
debt:* a separate `losBlockerHeight` field would model this without a
heuristic — see `D3_Setup_In_Action_Log.todo.md` and the height-tech
TODO list.

## 3. Cover (`calculateCover`)

Encodes rulebook "Cover" sidebar:

1. **No LoS → no cover.**
2. **Target inside a `providesCover` terrain → cover** (Area-feature
   rule). Note: this clause is currently height-blind — a shooter on a
   roof firing into a forest still grants cover. Documented as
   rules-as-written; revisit if it causes unrealistic outcomes.
3. **Ray crosses a `providesCover` piece**, AND
   - `coverTop = baseElevation + objectHeight`, with shooter and
     target both **below** the cover top (otherwise: cover is
     useless), AND
   - the cover cell is **more than 1 grid cell** (Chebyshev > 1) from
     the firer (rulebook "more than 1" from the firer" — within 1, the
     firer leans over and shoots without granting cover).

`coverTop` no longer has the legacy `top===0 → ∞` heuristic; cover
pieces must declare height explicitly. The `obstacleTop` heuristic
(LoS) remains, scoped to doors as documented above.

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
