# AGENTS.md

Compact guidance for OpenCode sessions in this repo.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — production build (outputs `dist/`; also generates `bundle-stats.html`)
- `npm run test` — **starts Vitest in watch mode** by default. Use `npx vitest run` for a single run.
- `npm run test -- path/to/file.test.ts` — focused test file (still watch mode unless you append `-- --run`)
- `npx eslint .` / `npx eslint --fix .`
- `npx prettier --write .`

Pre-commit: Husky + lint-staged auto-runs `eslint --fix` and `prettier --write` on staged `.{js,jsx,ts,tsx}` files.

## Architecture

Single-package Vite app. React 19 + TypeScript + Tailwind CSS v3 + Zustand + Three.js.

- `/components/` — React UI (domain-organized: `battle/`, `campaign/`, `ui/`, `modals/`, `debug/`)
- `/stores/` — Zustand stores with immer (`battleStore`, `campaignStore`, `crewStore`, `multiplayerStore`, `uiStore`, `hudStore`)
- `/services/engine/` — **Pure deterministic battle engine (V2)**. The most critical directory.
- `/services/application/` — Use cases orchestrating domain logic
- `/services/domain/` — Pure business/game rules
- `/services/api/` — External API integration (Gemini)
- `/hooks/` — Custom React hooks
- `/constants/` — Static game data
- `/types/` — TypeScript domain types
- `/tests/` — Fixtures (`tests/fixtures/`), helpers (`tests/helpers/`), integration scenarios (`tests/scenarios/`)

Path alias `@/` maps to the project root.

## Engine V2 Hard Constraints

Enforced by ESLint in `.eslintrc.cjs`. Non-negotiable.

1. **Determinism** — `Math.random()`, `Date.now()`, `performance.now()` are forbidden inside `/services/engine/`. Use the seeded `RngState` from `services/engine/rng/`.
2. **Purity** — No Zustand, React, localStorage, timers, or PeerJS code inside `/services/engine/`. `no-restricted-imports` blocks imports from `zustand`, `react`, `@/components/*`, `@/hooks/*`, `@/stores/*`.
3. **Reducer contract** — `reduceBattle(state, action, deps)` must return `{ next, events, log, stateHash }`. Never conflate these fields.
4. **Event stream immutability** — The `events` array is append-only. Consume via `eventCursor`. Never `shift()` or mutate.
5. **Strict typing** — Avoid `any` and `eslint-disable`, especially in engine code and tests.

AI turns are processed atomically via the `PROCESS_AI_TURN` action, emitting an event stream consumed by the UI for animations.

## Multiplayer

PeerJS WebRTC peer-to-peer. Host maintains an action log with state hashes. Reconnecting guests catch up via delta replay (<200 actions) or full snapshot fallback. All peers replay identical actions through the deterministic reducer for identical state.

**UI guard**: Any engine V2 UI controls must be `disabled`/`hidden` when `multiplayerRole != null`.

## Testing

- Vitest with `globals: true`, `environment: 'jsdom'`, setup file `vitest.setup.ts`.
- **Golden V1 tests** (`tests/scenarios/golden_v1_*.test.ts`) — Regression suite. Must remain stable.
- **Parity tests** (`tests/scenarios/parity/`) — Compare Engine V1 and V2 behavior with identical RNG scripts. Write the parity test **before** migrating a mechanic to V2.
- **Bug scenario tests** (`tests/scenarios/bugs/`) — Reproduce and verify specific bug fixes.
- **Mock RNG** — `tests/helpers/mockRng.ts` for deterministic scripted RNG.
- **Fixtures** — `tests/fixtures/battleFixtures.ts` for reusable test state builders.

## TypeScript / Tooling Quirks

- `tsconfig.json` has **`"strict": false`**. Also `noUnusedLocals: false` and `noUnusedParameters: false`.
- **Critical exclusions**: `tsconfig.json` explicitly excludes these files from compilation. They will not be type-checked by `tsc`:
  - `battleStore.ts`, `crewStore.ts`, `campaignStore.ts`
  - `CrewCreator.tsx`, `PostBattleSequence.tsx`
  - `components/JobBoard.tsx`
  - `services/battleDomain.ts`
- There is no `typecheck` script in `package.json`. Use `npx tsc --noEmit` manually if you need it (note the exclusions above).
- Tailwind CSS v3 is used with `@tailwind` directives in `index.css`. No `tailwind.config.js` is present; it likely relies on default configuration.
- Build copies `locales/`, `assets/`, and `assets/portraits/` to `dist/` via `vite-plugin-static-copy`.

## Commit Style (Conventional Commits)

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/) so `git log` is machine-readable and LLM-context-friendly.

Format: `<type>[optional scope]: <description>`

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `i18n`

**Scopes (use when relevant):**
- `engine` — battle engine V2 core logic
- `rules` — game rules (shooting, visibility, pathfinding)
- `ai` — AI planners and dispatchers
- `ui` — React components and HUD
- `mp` / `multiplayer` — PeerJS sync and networking
- `campaign` — campaign manager features
- `test` — test files and fixtures

**Good examples:**
- `feat(rules): add Area feature LoS terminates at nearest edge`
- `fix(ai): JUMP_DOWN fallback when stranded on elevation`
- `refactor(engine): extract isPointInTerrain to utils/terrain`
- `docs(engine): refresh Visibility spec and post-review TODO`
- `i18n: add Jump Down button tooltip and log entries`
- `test(parity): verify deterministic AoE results`

**Rules:**
- One logical change per commit (atomic).
- Use imperative mood (`add`, not `added`).
- If a commit closes a plan item, reference it: `(C4)`, `(M2)`, etc.
- Do not mix refactoring and features in the same commit.

## Style & Workflow

- **Parity testing first** — When migrating a mechanic to V2, create `enginev2_[feature]_parity.test.ts` before writing any V2 logic.
- **Micro-iterations** — Single-goal PRs/commits, smallest possible diffs.
- **State management** — Components subscribe to specific Zustand store slices to optimize re-renders.
- Use `@/` path alias for imports from the project root.
