# Specification: Height Mechanics

**Goal:** First-class elevation in Engine V2 — terrain data model,
figure-Z computation, climb costs, jump-down action, fall damage, and
Good Shot Height Advantage. Faithful to the Five Parsecs rulebook
("Moving Up and Down", "Lines of Sight" rooftop case, "Good Shot"
errata).

**Implemented across blocks B (data model) and C (rules).**
**Coordinates:** 1" = 1 grid unit = 1 human figure height.

---

## 1. Data Model — `Terrain`

Two independent height fields on every `Terrain` (see
`types/battle.ts`):

| Field | Meaning | Default |
|---|---|---|
| `baseElevation` | Height of the figure-supporting **surface** | 0 |
| `objectHeight`  | Vertical **thickness** of the piece above its base | 0 |

| Piece | `baseElevation` | `objectHeight` | `figureZ` standing on it |
|---|---|---|---|
| Open ground | 0 | 0 | 0 |
| 1-tall hill | 0 | 1 | 1 |
| 2-tall waist wall | 0 | 2 | (impassable — figures don't stand on it) |
| 2-tall building roof | 2 | 0 | 2 |
| 3-tall plateau | 0 | 3 | 3 |
| Closed door | 0 | 0 | 0 (figure walks through) |

**LoS-blocker top** = `baseElevation + objectHeight` (the cell's actual
top), used by `obstacleTop`/`coverTop`.

**Concealing Areas** opt in via `concealsLineOfSight: boolean` —
forest/swamp/jungle/smoke. See `Visibility.spec.md` §2.2.

## 2. `getFigureZ(state, pos)`

Located in `services/engine/battle/rules/goodShotRules.ts`.

```
walkable = state.battle.terrain.filter(t => !t.isImpassable && t covers pos)
return max(t.baseElevation + t.objectHeight) over walkable, or 0 if none
```

**Why "max":** if multiple walkable terrain pieces overlap a cell, the
highest stack wins (e.g., a hill on top of a base layer).

**Why `!isImpassable`:** walls don't support figures; you can't stand
on them, so they don't contribute to figureZ even though they cover
the cell.

## 3. Pathfinding Climb Cost

Located in `services/engine/utils/pathfinding.ts:getElevationCost`.

| Δz = `figureZ(to) - figureZ(from)` | Cost |
|---|---|
| `> 0` (climb up) | `+Δz` |
| `0` or `-1` (flat / drop ≤ 1) | 0 |
| `< -1` (drop > 1) | **`null` — edge refused** |

**Why `null` for descent > 1:** rulebook treats large drops as JUMP
actions (with their own fall-damage check). A walking path off a
3-tall plateau is impossible; the AI must `JUMP_DOWN`.

`getCellCost` independently rejects `isImpassable` cells; combined
with `getElevationCost`, A* yields only legally walkable paths.

## 4. JUMP_DOWN Action

`{ type: 'JUMP_DOWN'; participantId; to: Position }` — see
`services/engine/battle/actions/jumpDown.ts`.

### Handler

1. Validates: actor exists, not casualty.
2. Computes `drop = figureZ(from) - figureZ(to)`. Throws if
   `drop <= 0` (must be strictly downward).
3. Moves the participant.
4. If `drop >= FALL_DAMAGE_THRESHOLD` (= 3): rolls a d6 from the
   seeded RNG and runs `computeFallDamage(drop, d6)`.

### Fall damage (`fallRules.ts`)

`damage = d6 + drop` (RNG-pure helper).

Outcome vs target's own `Toughness`:
- `damage >= toughness` → `casualty`, `actionsRemaining = 0`.
- `damage <  toughness` → `stunned`, `+1 stunToken`.

RNG advances **only** when the drop is large enough to risk damage
(safe drops never consume the RNG).

Emits `FALL_DAMAGE_RESOLVED` event with `{participantId, dropHeight,
d6Roll, damage, toughness, outcome}`. *Tech debt:* trait pipeline
(`Stoic`, armor saves, Neural Optimization) does not yet apply.

## 5. AI Stranded-on-Plateau Fallback

`services/engine/battle/ai/aiDispatcher.ts` has a pre-step: if
`figureZ(actor) > 0`, no walkable path exists to any enemy, but
`findJumpDownTargets(actor)` yields a candidate, the dispatcher returns
`[{ JUMP_DOWN: pickSafestJumpDownTarget(...) }]` as the entire turn.

The jump alone is the turn — fall damage may stun the actor anyway,
and even when it doesn't, normal AI behaviour resumes next turn from
the new ground-level position.

## 6. Good Shot — Height Advantage

Rulebook errata: a firer "positioned at least one human figure height
higher than the target" may reroll a single 1 on the firing dice.
Located in `goodShotRules.ts`.

### Predicate

`hasHeightAdvantage(state, attackerPos, targetPos): boolean` —
`figureZ(attacker) - figureZ(target) >= 1`.

### Reroll helper

`applyGoodShotReroll(rolls, rng, deps, eligible)` operates on an
**array** of d6 results. When eligible, rerolls the **first** 1 in the
array (deterministic choice for replay). RNG advances exactly once
when a reroll fires; never otherwise.

Currently called by `shootAttack.ts` with a 1-element array; the
helper's array signature is what makes it forward-compatible with
multi-shot weapons (`weapon.shots > 1`) without re-deriving reroll
semantics.

## 7. UI Surface

`components/battle/EngineV2HudControls.tsx` exposes a **Jump Down**
button:

- Disabled unless the selected participant has at least one valid drop
  target (`findJumpDownTargets` non-empty).
- Click dispatches `JUMP_DOWN` to `pickSafestJumpDownTarget` (lowest
  drop wins).
- Variant turns `danger` and tooltip flags risk when the chosen drop
  is at or above the fall-damage threshold.
- Multiplayer-guarded by the existing HUD gate.

Cell-picker UX and falling animation are intentionally not in scope
here — see `docs/engine/Post_AD_Review_TODO.md` (item L4).

## 8. Determinism Invariants

- Every dice roll in the height pipeline (Good Shot reroll, fall
  damage, AI dispatcher's eventual decisions) goes through the seeded
  RNG. None of `Math.random`, `Date.now`, `performance.now` is used
  inside `services/engine/`.
- Replay invariant: given the same `Battle.seed` and the same action
  log, two peers reach identical state hashes (proven by 489+
  passing tests; round-trip MP integration test deferred — see
  `D3_Setup_In_Action_Log.todo.md`).
