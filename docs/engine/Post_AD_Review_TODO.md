# Post A→D Review — Open Items

Tracks the leftovers from the A→D code review (2026-04-27). The
high-priority gap (AI stranded on plateau) is **closed** by `bf97605`.
Everything below is documented here so future work can pick a focused
slice.

---

## Medium priority

### ~~M1. `calculateCover` step 2 is height-blind~~ — closed in `f6b7f03`

Step 2 now negates cover when `shooterZ > coverTop`. Target inside
a hedge gets cover from a ground-level shooter; a roof-side shooter
sees over.

### ~~M2. Cleaner LoS-blocker height than the door heuristic~~ — closed in `1e76e14`

`losBlockerHeight?: number` field added to `Terrain`. Doors declare
it explicitly; `obstacleTop` no longer has the `top===0 → ∞`
heuristic. Migrated production door fixture and visibility parity
tests.

### ~~M3. Concealing-Area heuristic fallback still in code~~ — closed in `9b6ffe9`

Verified across all 11 files using `type:'Area'` that none currently
relied on the implicit fallback (every fixture either had explicit
flag, or had `providesCover:false`/`objectHeight>0` excluding it
already). Heuristic dropped; `isConcealingArea` is now strictly
`type === 'Area' && concealsLineOfSight === true`.

### ~~M4. Naming collision: D1–D4~~ — closed in `251b6a2`

Authoritative remap published at
`docs/engine/REPORTS/2026-04-27-Engine-V2-Height-Multiplayer-Changelog.md`.
The 4 C-debt commits become `C-debt-1..4` (`2b79ec1`, `8aac35a`,
`d2bee4b`, `4bee40a`); the 2 multiplayer commits become `MP-1..2`
(`ac6d08e`, `1ce5949`). Convention going forward: avoid reusing
letters once they've been spent on a block.

---

## Low priority

### L1. No round-trip MP integration test for D2

**What:** D2 covers host/guest agreement at the unit level —
`setNewBattle` produces identical RNG state for the same payload.
Full E2E (host calls `startMultiplayerBattle` → `START_BATTLE`
serialised → guest receives → identical post-action hashes) is not
covered.

**Why deferred:** PeerJS is heavy to mock. Worth doing once the
protocol stabilises further.

### ~~L2. Multi-shot weapons not yet iterating in `shootAttack`~~ — closed in `3190156`

`weapon.shots > 1` now fires the full volley. All firing dice rolled
up-front, Good Shot reroll selects the first 1 across the array, each
shot resolves in order. V1 features still missing in V2: focused
trait and aimed-shot rerolls — separate follow-ups, not in scope.

### ~~L2.1. Target switching on a destroyed defender~~ — closed in this commit

Rulebook (multi-shot weapons): "If the target is destroyed, you may
select another target within 3" of the original." On a lethal hit
mid-volley, `shootAttack` now picks the closest enemy within
Chebyshev 3 of the killed target (id-sort tiebreaker), with LoS from
the attacker. Re-emits `SHOOT_DECLARED`, recomputes the hit target
number for the new target, and continues with remaining firing
dice. If no candidate exists, logs `targetEliminatedNoTargets` and
ends the volley as before.

### L3. Fall damage outside `TraitPlugin` pipeline

**What:** `JUMP_DOWN` damage is raw d6 + drop vs Toughness. No
`Stoic`/armor save/Neural Optimization integration.

**Why deferred:** the V1 trait context (`HitContext` etc. in
`types/battle.ts`) is V1-flavoured (carries `Battle`, not
`EngineBattleState`). Wiring it to V2 action handlers needs a
bridge or a new V2-trait system.

### L4. UX polish for Jump Down

- Cell-picker mode (player chooses destination) via
  `PlayerActionUIState`.
- Falling animation in `AnimationLayer`.
- Visual indicator on the grid showing valid drop cells while Jump
  Down is hovered.

---

## Architectural — separate project

### A1. Lift battle setup into the action log (D3)

See `docs/engine/D3_Setup_In_Action_Log.todo.md` — the deferred D3
work. Snapshot-free replay needs `setupBattle` to produce a skeleton
Battle and let the engine action log do terrain generation,
deployment, and mission init.

### A2. AI awareness of `JUMP_DOWN` for offense, not just stranded fallback

Right now AI only jumps when stranded. A player could also use
JUMP_DOWN tactically — drop into brawl range, accept the fall risk
to flank. AI doesn't currently weigh that. Out of scope until basic
positional behaviour is good enough that this would be a noticeable
improvement.

---

## Snapshot

- 499/499 tests green at the latest update. Closures: M1 `f6b7f03`,
  M2 `1e76e14`, M3 `9b6ffe9`, M4 `251b6a2`, L2 `3190156`. The
  high-priority AI fallback closed earlier in `bf97605`.
- All remaining items (L1, L3, L4, A1, A2) are non-blocking — current
  behaviour is correct or conservative; the items are about model
  clarity, coverage, forward-compatibility.
