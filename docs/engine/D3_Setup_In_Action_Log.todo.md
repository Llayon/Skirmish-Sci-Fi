# D3 (deferred): lift battle setup into the action log

**Status:** not started — explicitly deferred after D2 (`1ce5949`).
**Owner:** unassigned.
**Last updated:** 2026-04-26.

---

## Why this is on the list

After D1 (`ac6d08e`) and D2 (`1ce5949`), the multiplayer pipeline is
deterministic from `Battle.seed` onward — host and guest reach
identical `EngineBattleState.rng` after `START_BATTLE` and every
subsequent dice roll matches. Terrain generation, despite running
through `reduceBattle({ type: 'GENERATE_TERRAIN', ... })`, is still
invoked **outside** the action log: `setupBattle` calls
`runTerrainAction` locally on the host and embeds the resulting
`terrain[]` in the `Battle` payload that ships via `START_BATTLE`.
Guests adopt the host's bytes; they do not re-run `GENERATE_TERRAIN`.

That works today, but it means:

- The action log is **not** self-sufficient. Reproducing a battle
  from `(seed, [actions...])` requires the pre-built `terrain[]` from
  the snapshot — true snapshot-free replay is impossible.
- `START_BATTLE` payload carries terrain bytes that the guest could
  have derived from the seed alone.
- Future log-compaction (drop old snapshots, keep only the action
  log) cannot work for setup state.

## What "done" looks like

1. `setupBattle` returns a **skeleton** Battle: no `terrain`, no
   participants placed, just `seed`, `gridSize`, mission template,
   and the initial RNG-derived state needed to drive the first
   actions.
2. Setup steps that today happen synchronously in `setupBattle`
   (terrain generation, deployment, participant placement, mission
   state init) become engine actions queued at the start of the log:
   - `GENERATE_TERRAIN` (already exists)
   - `MISSION_SETUP` (exists; expand scope to include placement)
   - possibly new actions: `DEPLOY_PARTICIPANTS`, `INIT_MISSION_STATE`
3. `START_BATTLE` payload shrinks to the skeleton + the initial
   action log (or just the skeleton, with the host's first
   `ENGINE_ACTION` messages doing the rest).
4. Guests apply the action log against an RNG seeded from
   `battle.seed` and reach an identical state.

## Why we deferred

- `setupBattle` (≈600 lines in `services/application/battleSetup.ts`)
  interleaves terrain generation with deployment, mission scaffolding,
  rival/quest branching, world-trait modifiers, and participant
  construction. Pulling each of these into discrete reducer actions
  is a real refactor, not a one-line change.
- Plenty of existing tests assume `battle.terrain.length > 0` and a
  fully-populated `participants[]` immediately after `setupBattle`
  resolves. They would all need rework.
- The current architecture is correct (deterministic, host/guest
  agree). D3 is an architectural improvement, not a bug fix.

## Concrete first steps when picking it up

1. Add an integration test that asserts: given the same `Battle.seed`
   and the same `[GENERATE_TERRAIN, ...]` action log, two fresh
   `EngineBattleState`s reach identical `stateHash`. This is the
   invariant D3 protects.
2. Carve `runTerrainAction` out of `setupBattle` — call it a
   "terrain bootstrap action" that the host queues into the engine
   before sending `START_BATTLE`. Guests receive both the skeleton
   and the queued action, replay it, and self-build terrain.
3. Repeat for deployment and mission init. Each step is its own PR.
4. Once setup is fully in the log, drop terrain from the
   `START_BATTLE` payload and verify guests still work.

## Related

- D1: `feat(mp): persist battle.seed for deterministic reproduction`
- D2: `feat(mp): V2 RNG initializes from battle.seed in setNewBattle`
- `docs/engine/Reconnect_Delta_Sync.spec.md` — existing log-replay
  contract D3 plugs into.
