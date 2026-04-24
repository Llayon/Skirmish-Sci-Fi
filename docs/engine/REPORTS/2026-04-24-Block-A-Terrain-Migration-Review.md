# Block A — Terrain Generation → Engine V2 Migration Review

**Date:** 2026-04-24
**Scope:** Move battlefield generation from V1 (non-deterministic `Math.random()`) into Engine V2 (seeded Mulberry32, reducer-driven).
**Outcome:** Complete. Generation is deterministic, parity-locked against V1 output, and flows through the same action pipeline as every other V2 mechanic.

---

## Commits

| SHA | Step | Summary |
|-----|------|---------|
| `5f379b3` | A1 | Parity baseline: golden snapshots for V1 generator under Mulberry32-equivalent mock. |
| `ce6e8d5` | A2 | Port `terrainGenerator` to seeded RNG; all `Math.random()` / `rollD6()` replaced. |
| `05d9716` | A3 | `GENERATE_TERRAIN` action + `TERRAIN_GENERATED` event, reducer case, 6 action tests. |
| `f911455` | A4 | `setupBattle` routes terrain through `reduceBattle` via a skeleton engine state. |
| `be58aec` | — | Review fixup: `prefer-const` on terrain accumulator. |

**Line count:** ~3,160 insertions / 105 deletions across 9 files (2,709 of which is the snapshot file).

---

## What was achieved

### Determinism
Every `Math.random()` call inside `terrainGenerator.ts` (11 occurrences: `findFreeSpot`, door placement, linear orientation) is gone. All draws go through the seeded RNG in `services/engine/rng/rng.ts` (Mulberry32). A given `createRng(seed)` always produces the same layout.

### Parity contract
4 golden snapshots — one per theme (`Industrial`, `Wilderness`, `AlienRuin`, `CrashSite`) — were captured in A1 under a Mulberry32-equivalent mock of V1. The same snapshots pass unchanged after A2/A3/A4 when the seeded RNG is driven directly. This proves the rewrite reproduces V1 behavior bit-for-bit given an equivalent seed.

### Action-pipeline integration
Terrain creation is now a `BattleAction` (`GENERATE_TERRAIN`). The reducer produces a `TERRAIN_GENERATED` event for UI and a log entry, advances the RNG cursor, and returns the state hash. Multiplayer peers replaying the same action log with the same seed will reach byte-identical terrain.

### Purity
`generateTerrain.ts` under `services/engine/` does not import Zustand, React, stores, hooks, or timing primitives. ESLint `no-restricted-imports` overrides are satisfied.

### Test coverage
- 12 parity tests (4 determinism × themes + different-seed check + RNG advance + invariants + crystals trait + 4 golden snapshots).
- 6 action unit tests (replace terrain, RNG advance, deterministic hash via `reduceBattle`, different seeds diverge, worldTraits passthrough, scripted-RNG guard).
- Full suite: **415/415 green** in 82 test files.

---

## Key design decisions

### RngCursor wrapper
The engine RNG API is immutable (`d6(state) → {value, next}`). Threading an immutable cursor through every helper in the generator would have been noisy. Instead, `terrainGenerator.ts` creates a local `RngCursor` — a closure over a mutable `let state` that internally calls the pure primitives. Naked mutation stays inside one file; the public API returns the final immutable `SeededRngState` for the caller. Best of both worlds: ergonomic point-of-use, pure boundary.

### `nextFloat` exposed
The generator makes several decisions on floats rather than dice (`findFreeSpot` uniform placement, `Math.random() > 0.5` linear orientation, door side). Rather than approximate these with `d100`-mod tricks — which would have changed the RNG consumption pattern and broken parity — `nextFloat` was exported from `rng.ts`. This is a small API widening, justified by the fact that it is already the underlying primitive behind `d6`/`d100`.

### Scripted RNG rejected in action
`GENERATE_TERRAIN` throws when `state.rng` is scripted. The scripted RNG protocol only models `d6`/`d100`, not floats, so replaying generation under a scripted seed is not currently expressible. Seeded RNG is the supported path; parity tests drive the generator directly with `createRng`.

### Skeleton engine state in `setupBattle`
`setupBattle.ts` is still V1 application code — it has no natural `EngineBattleState` in scope when it needs terrain. Rather than blocking on a full V2 migration of the setup layer, a minimal `EngineBattleState` skeleton is built inline, `reduceBattle` is called for just the `GENERATE_TERRAIN` action, and the resulting `terrain` is lifted out. Zero behavior change; one more piece of the V1 setup flow now speaks the V2 action vocabulary.

---

## Tech debt and notes

### ⚠ Medium — Multiplayer seed propagation is not wired
Current seeding uses `Date.now() & 0x7fffffff` inside `setupBattle`. Host and guest calling `setupBattle` independently would produce different seeds → different terrain. This is currently masked by the host broadcasting a full `Battle` snapshot to the guest, so the guest never runs its own `setupBattle`. If we ever want peers to independently dispatch `GENERATE_TERRAIN`, we need a shared seed negotiated at lobby time. **Tracked for Block D (multiplayer seed propagation).**

### Low — Module location
`terrainGenerator.ts` lives under `services/`, not `services/engine/`. Formally allowed by ESLint (the no-restricted-imports rule whitelists `@/services/*`), but conceptually an engine action now depends on code outside the engine directory. A mechanical move to `services/engine/battle/terrain/generator.ts` would resolve this. No urgency — the generator has zero impure dependencies.

### Low — `terrainIdCounter` is module-level mutable
`let terrainIdCounter = 0` is reset at the start of every `generateTerrain` call, so IDs are deterministic within a single call (`terrain_0`, `terrain_1`, …). Two parallel invocations would collide on IDs. Not a real issue for single-battle flow. Worth cleaning up when the generator moves into the engine directory: fold the counter into a local closure or derive IDs from an index.

### Low — `GENERATE_TERRAIN` has no phase guard
The action unconditionally replaces `state.battle.terrain` and `state.battle.gridSize`. A misfiring dispatch mid-battle would wipe the board with no warning. Adding a guard (e.g., only permitted when `phase === 'reaction_roll'` or `terrain.length === 0`) is a small defensive improvement for later.

### Low — `nextFloat` in scripted RNG is not modeled
The scripted RNG protocol tracks `d6` and `d100` entries only. If we later want a scripted parity test for terrain generation (rather than a seeded one), we would need to extend `RngScriptItem` with a `'float'` die kind. Deferred.

### Cosmetic — WorldTrait casts in tests
Both the parity test and the action test pass `worldTraits` via `{id:'crystals', ...} as unknown as ...` casts. Replacing with a direct import of `WorldTrait` from `@/types/campaign` would clean this up. 5-minute chore, not blocking.

### Cosmetic — Pre-existing lint noise in `battleSetup.ts`
9 pre-existing ESLint errors live in the file (unused imports from the big type barrel on line 1, `let participants`). Not introduced by Block A; opportunistic cleanup whenever the file is next touched.

### ⚠ Low — `runTerrainAction` discards `stateHash` and `events`
The V1 setup flow doesn't consume either. Fine today, but if `setupBattle` eventually wants an initial state hash (for lobby fingerprinting or MP handshake), this is one place to remember.

---

## Readiness for Block B (elevation)

Block A leaves generation at a single well-defined choke point: the `GENERATE_TERRAIN` action. Adding elevation is now a matter of:
1. Extending the `Terrain` shape with an `elevation: number` field.
2. Having the generator populate it (during the same `GENERATE_TERRAIN` dispatch).
3. Having the 3D adapter read `terrain.elevation` instead of hardcoding by name.

The golden snapshots serve as a structural regression guard: adding a new field won't invalidate them unless the existing `position/size/name/flags` change, which would be an unrelated bug.

---

## Bottom line

Block A is closed. Terrain generation is fully deterministic, flows through Engine V2, is protected by 4 golden parity snapshots across all themes, and carries 18 tests. One low-risk follow-up (seed propagation for MP) is deferred to Block D. Ready to proceed with Block B (elevation as data).
