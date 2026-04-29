# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Five Parsecs: Campaign Manager — a browser-based turn-based tactical combat game and campaign manager based on "Five Parsecs From Home" (sci-fi wargame rulebook). React 19 + TypeScript + Zustand + Three.js frontend, with a pure deterministic battle engine (Engine V2) and PeerJS-based multiplayer.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — production build
- `npm run test` — run all tests (Vitest)
- `npm run test -- path/to/file.test.ts` — run a single test file
- `npm run test -- --watch` — watch mode
- `npx eslint .` — lint everything
- `npx eslint --fix .` — lint with auto-fix
- `npx prettier --write .` — format all files

Pre-commit hooks (Husky + lint-staged) automatically run `eslint --fix` and `prettier --write` on staged `.{js,jsx,ts,tsx}` files.

## Architecture

### Layers

- **`/components/`** — React UI components organized by domain (`battle/`, `campaign/`, `ui/`, `modals/`, `debug/`)
- **`/stores/`** — Zustand stores with immer middleware: `battleStore`, `campaignProgressStore`, `campaignStore`, `crewStore`, `multiplayerStore`, `shipStore`, `uiStore`, `hudStore`
- **`/services/engine/`** — Pure deterministic battle engine (V2). This is the core of the project.
- **`/services/application/`** — Use cases orchestrating domain logic
- **`/services/domain/`** — Pure business/game rules
- **`/services/api/`** — External API integration (Gemini for AI-driven story enrichment)
- **`/hooks/`** — Custom React hooks bridging stores and components
- **`/constants/`** — Static game data (items, enemies, terrain, encounters)
- **`/types/`** — TypeScript type definitions for domain models
- **`/tests/`** — Fixtures (`tests/fixtures/`), helpers (`tests/helpers/`), integration scenarios (`tests/scenarios/`)

### Engine V2 (Deterministic Reducer)

The battle engine lives in `/services/engine/` and follows a pure reducer pattern:

```
reduceBattle(state, action, deps) → { next, events, log, stateHash }
```

Key subdirectories:
- `battle/actions/` — Action resolvers (move, shoot, brawl, grenade, consumable, etc.)
- `battle/ai/` — 7 AI profiles: Aggressive, Rampaging, Cautious, Tactical, Defensive, Beast, Guardian
- `battle/rules/` — Pure game rules (shooting, targeting, AoE, pushback)
- `rng/` — Seeded Mulberry32 RNG (deterministic, never use `Math.random()`)
- `net/` — Deterministic state hashing for multiplayer sync
- `utils/` — Pathfinding, raycast, grid math

AI turns are processed atomically via the `PROCESS_AI_TURN` action, emitting an event stream consumed by the UI for animations.

### Multiplayer (Delta Sync)

PeerJS WebRTC peer-to-peer. The host maintains an action log with state hashes. Reconnecting guests catch up via delta replay (<200 actions) or full snapshot fallback. All peers replay identical actions through the deterministic reducer for identical state.

### Path Alias

`@/` maps to the project root (configured in `vite.config.ts` and `tsconfig.json`).

## Engine V2 Hard Constraints

These are enforced by ESLint rules in `.eslintrc.cjs` and are non-negotiable:

1. **Determinism** — `Math.random()`, `Date.now()`, `performance.now()` are **forbidden** in `/services/engine/`. Use the seeded `RngState` from `services/engine/rng/`.
2. **Purity** — No Zustand, React, localStorage, timers, or network (PeerJS) code inside `/services/engine/`. Enforced via `no-restricted-imports`.
3. **Output separation** — Engine must return `{ next, events, log, stateHash }`. Never conflate these.
4. **Event stream immutability** — The `events` array is append-only. Consume via `eventCursor`. Never `shift()` or mutate.
5. **Strict typing** — Avoid `any` and `eslint-disable`, especially in engine code and tests.

## Testing Patterns

- **Golden V1 tests** (`tests/scenarios/golden_v1_*.test.ts`) — Regression suite. Must remain stable; do not change V1 behavior without feature flags and regression testing.
- **Parity tests** (`tests/scenarios/parity/`) — Compare Engine V1 and V2 behavior with identical RNG scripts. When migrating a mechanic to V2, write the parity test **first**.
- **Bug scenario tests** (`tests/scenarios/bugs/`) — Reproduce and verify specific bug fixes.
- **Mock RNG** (`tests/helpers/mockRng.ts`) — Provides deterministic scripted RNG for reproducible tests.
- **Battle fixtures** (`tests/fixtures/battleFixtures.ts`) — Reusable test state builders.

## Development Patterns

- **Parity testing first** — When migrating a mechanic to V2, create `enginev2_[feature]_parity.test.ts` before writing any V2 logic.
- **Micro-iterations** — Single-goal PRs/commits, smallest possible diffs. Break broad tasks into atomic steps.
- **Multiplayer UI guards** — Any engine V2 UI controls must be `disabled`/`hidden` when `multiplayerRole != null`.
- **State management** — Components subscribe to specific Zustand store slices to optimize re-renders.
- **Styling** — Tailwind CSS.

## Key Types

- `EngineBattleState` — Full battle state including RNG state
- `BattleAction` — Discriminated union of all action types
- `BattleEvent` — UI-facing event stream entries
- `BattleEngineResult` — Reducer output with next state, events, log, and hash
