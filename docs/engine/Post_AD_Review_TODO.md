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

### M3. Concealing-Area heuristic fallback still in code

**Where:** `visibilityRules.ts:80-82`.

**What:** When `Terrain.concealsLineOfSight` is undefined, fall back
to `(providesCover && baseElevation==0 && objectHeight==0)`. The
generator no longer produces such pieces (verified in `8aac35a`); only
some legacy fixtures.

**Fix:** sweep remaining fixtures, set the flag explicitly, drop the
fallback.

### M4. Naming collision: D1–D4

**Issue:** Closure of C tech-debt was tagged `(D1)`–`(D4)` in commit
messages (`2b79ec1`, `8aac35a`, `d2bee4b`, `4bee40a`). Multiplayer
seed propagation then started over with `(D1)`–`(D2)` (`ac6d08e`,
`1ce5949`). Git archaeology will be confusing.

**Fix:** in any future CHANGELOG/release notes, refer to commits by
hash or use a clearer scheme (e.g. `Cdebt-1`…`Cdebt-4` vs `MP-1`…).

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

### L2. Multi-shot weapons not yet iterating in `shootAttack`

**What:** `applyGoodShotReroll` already accepts an array (D4,
`4bee40a`), so the reroll semantics are multi-shot-ready. But
`shootAttack.ts` still rolls a single d6 — `weapon.shots > 1` is
ignored.

**Pickup:** when implementing multi-shot, build the rolls array up-front,
hand it to the helper, then resolve hits per-die.

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

- 495/495 tests green at the latest update (commits `1e76e14`
  closing M2, `f6b7f03` closing M1).
- All remaining items are non-blocking — current behaviour is correct
  or conservative; the items are about model clarity, coverage,
  forward-compatibility.
