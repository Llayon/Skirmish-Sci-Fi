# Engine V2 — Height + Multiplayer changelog (Block A → present)

**Window:** `5f379b3` (V1 terrain parity baseline) … `9b6ffe9` (drop
concealsLineOfSight heuristic).

**Why this doc exists:** the `(D1)`–`(D4)` tag was used twice during
this work — first for the tail of the C-block tech-debt closure, then
again for the Block D multiplayer seed propagation. This page is the
authoritative remap so future git-archaeology resolves the labels
unambiguously. Closes M4 from `Post_AD_Review_TODO.md`.

---

## Authoritative block naming

| Stable label | What it actually is | Tag used in commits |
|---|---|---|
| **Block A** | Terrain generation migrated to Engine V2 (seeded RNG, GENERATE_TERRAIN action) | `Block A` / no tag |
| **Block B** | Height as first-class on Terrain — `baseElevation` + `objectHeight` split, multi-cell render | `Block B1`–`B4` |
| **Block C** | Height-aware rules on top of B: LoS, Cover, climb, JUMP_DOWN, AI fallback | `C1`–`C5c` |
| **Block C-debt** | C-block review tech-debt closure (refactors and a Good Shot helper) | `(D1)`–`(D4)` ← **collision** |
| **Block MP** | Multiplayer seed propagation (battle.seed + V2 RNG init) | `(D1)`–`(D2)` ← **collision** |
| **M / L items** | Post A→D review fixes | `M1`/`M2`/`M3`/`L2` |

---

## Commit map (oldest first)

| Hash | Stable label | Commit subject |
|---|---|---|
| `5f379b3` | Block A — A1 | test(engine): add V1 terrain generation parity baseline for V2 migration |
| `ce6e8d5` | Block A — A2 | refactor(engine): port terrainGenerator to seeded RNG (V2 parity) |
| `05d9716` | Block A — A3 | feat(engine): add GENERATE_TERRAIN Engine V2 action |
| `f911455` | Block A — A4 | refactor(battle): route terrain generation through reduceBattle |
| `be58aec` | Block A — lint | style(engine): prefer-const for terrain accumulator in generator |
| `bbbe0c9` | Block A — review | docs(engine): add Block A terrain migration review report |
| `e73144d` | Block B1 | feat(terrain): add elevation as first-class terrain data |
| `9803890` | Block B2 | feat(terrain): emit climbable building roofs at elevation 2 |
| `edda2b8` | Block B3 | refactor(terrain): split elevation into baseElevation + objectHeight |
| `323485f` | Block B4 | fix(render): center multi-cell terrain over its footprint and scale Floor geometry |
| `99c113c` | Block C1 | feat(rules): height-aware Line of Sight across linear obstacles |
| `9474390` | Block C2 | feat(rules): height-aware Cover with within-1-of-firer rule |
| `9323cbb` | Block C2.5 | feat(rules): Good Shot — Height Advantage triggers reroll of a 1 |
| `5df3cd4` | Block C3 | feat(rules): pathfinding climb cost |
| `c65545f` | Block C4 | feat(rules): Area features LoS terminates at nearest edge |
| `bf3e320` | Block C5a | feat(rules): fall damage computation |
| `9bdc2d9` | Block C5b | feat(engine): JUMP_DOWN action with fall-damage resolution |
| `4cead71` | Block C5c | feat(ui): Jump Down button in EngineV2 HUD |
| `a83b00e` | Block C — review fix | fix(rules): pathfinding refuses descent > 1, requires JUMP_DOWN |
| `a7d40bf` | Block C — i18n | i18n: Jump Down button, tooltip, and log entries |
| `2b79ec1` | **C-debt-1** *(commit tagged D1)* | refactor(engine): extract isPointInTerrain to utils/terrain |
| `8aac35a` | **C-debt-2** *(commit tagged D2)* | feat(rules): explicit concealsLineOfSight flag on Terrain |
| `d2bee4b` | **C-debt-3** *(commit tagged D3)* | refactor(rules): drop top===0 cover heuristic, migrate fixtures |
| `4bee40a` | **C-debt-4** *(commit tagged D4)* | refactor(rules): Good Shot reroll generalised over firing-dice array |
| `ac6d08e` | **MP-1** *(commit tagged D1)* | feat(mp): persist battle.seed for deterministic reproduction |
| `1ce5949` | **MP-2** *(commit tagged D2)* | feat(mp): V2 RNG initializes from battle.seed in setNewBattle |
| `67b9d66` | MP — deferred | docs(engine): roadmap entry for deferred D3 (setup in action log) |
| `bf97605` | A→D review — high-priority fix | fix(ai): JUMP_DOWN fallback when stranded on elevation |
| `d8335c2` | Docs | docs(engine): refresh Visibility spec, add Height Mechanics + post-review TODO |
| `1e76e14` | M2 | refactor(rules): explicit losBlockerHeight on Terrain |
| `f6b7f03` | M1 | fix(rules): height-aware cover when target is inside an Area |
| `beaa562` | Docs | docs(engine): reflect M1+M2 in Visibility spec and review TODO |
| `3190156` | L2 | feat(engine): multi-shot weapons in shootAttack |
| `7d01019` | Docs | docs(engine): mark L2 (multi-shot) closed in review TODO |
| `9b6ffe9` | M3 | refactor(rules): drop concealsLineOfSight heuristic fallback |

---

## Reading the collisions in context

When a future contributor sees `(D1)` or `(D2)` in a commit message, the
**date and surrounding diff** disambiguate:

- The 2026-04-26 batch `2b79ec1`/`8aac35a`/`d2bee4b`/`4bee40a` touches
  `services/engine/battle/rules/` (C-debt) — these are **Block C-debt**.
- The 2026-04-26 batch `ac6d08e`/`1ce5949` touches
  `services/application/battleSetup.ts` and `stores/battleStore.ts`
  (multiplayer seed) — these are **Block MP**.
- The reference `D3` in `D3_Setup_In_Action_Log.todo.md` is the
  **deferred MP step 3** (lift battle setup into the action log), not
  the C-debt-3 commit.

Future tags should avoid reusing letters once they've been spent on a
block. Suggested convention: `Cdebt-N`, `MP-N`, plain priority items
(`M1`, `L2`, `A1`).

---

## Test count over the window

- Block A baseline: 453 tests.
- Latest at `9b6ffe9`: **499 tests**, 88 files, all green.
- Net delta: **+46 tests** across the window. No regressions.
