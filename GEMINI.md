# Five Parsecs: Project Context

## Project Overview
This project is a browser-based game and turn-based tactical combat engine based on the rules of the solo sci-fi adventure wargame **'Five Parsecs From Home'**. 
It includes features for procedurally generating characters, managing a campaign (resources, jobs, events), playing tactical grid-based combat, multiplayer PvP, and AI-driven story enrichment.

## Tech Stack
- **Framework:** React 19
- **Language:** TypeScript
- **State Management:** Zustand
- **3D Graphics:** Three.js, React Three Fiber, React Three Drei
- **Styling:** Tailwind CSS
- **Real-time Communication:** PeerJS (WebRTC)
- **Build Tool:** Vite
- **Testing:** Vitest, React Testing Library

## Architecture & Directory Structure
The application follows a feature-based domain-driven structure:
- `/components/`: Reusable UI components categorized by domain (`battle/`, `campaign/`, `ui/`, `modals/`).
- `/stores/`: Global state management using Zustand, divided into logical stores (`battleStore`, `campaignStore`, `crewStore`, `uiStore`, `multiplayerStore`).
- `/services/`: Core application and business logic decoupled from the UI. Includes domain logic, external API adapters (e.g., Gemini), and Three.js logic.
- `/constants/`: Static game data, lookup tables, and configuration (items, enemies, terrain).
- `/hooks/`: Custom React hooks for shared logic, encapsulating state and service interactions.
- `/types/`: TypeScript type definitions for domain models and UI props.
- `/docs/`: Extensive project documentation, including migration plans (Three.js migration in progress).
- `/tests/`: Project testing suite containing fixtures, helpers, and scenarios.

## Building, Running, and Testing

**Prerequisites:** Node.js. The project contains both `package-lock.json` and `pnpm-lock.yaml`, but the README suggests using `npm`.

- **Install dependencies:** `npm install`
- **Start development server:** `npm run dev`
- **Build for production:** `npm run build`
- **Preview production build locally:** `npm run preview`
- **Run tests:** `npm run test`

## Development Conventions
- **Typing:** Strict TypeScript typing is required. Domain models are explicitly defined in the `/types/` directory.
- **State:** Use Zustand for global state. Components should subscribe to specific slices of state to optimize re-renders.
- **Styling:** Use Tailwind CSS for component styling.
- **Component Design:** Separation of concerns is maintained. Keep complex logic in `/services/` or `/hooks/` rather than directly in React components.
- **Testing:** Unit and component tests are written using Vitest. New features and bug fixes should be accompanied by relevant tests.
- **Pre-commit:** The project uses Husky and lint-staged to run ESLint (`eslint --fix`) and Prettier (`prettier --write`) on staged files before committing.

## Engine V2 Hard Constraints & Development Patterns

<hard_constraints>
- **Golden v1 Stability**: `Golden v1` tests must remain stable. Do not change v1 behavior without a feature flag and regression testing (or updating snapshots "by meaning").
- **Strict Determinism**: In `services/engine/**`, non-deterministic sources like `Math.random()`, `Date.now()`, `performance.now()` are FORBIDDEN (enforced by ESLint). Use the seeded `RngState` instead.
- **Pure Engine V2**: Engine V2 is absolutely pure. NO Zustand, NO UI, NO `localStorage`, NO timers, NO network (`PeerJS`) code inside the `services/engine` directory.
- **Strict Separation of Output**: Engine output must strictly separate `nextState`, `events`, `log` (EngineLogDelta), and `stateHash`.
- **Event Stream Immutability**: The UI event stream (`events` array) is append-only. Consume it via an `eventCursor`. NEVER use `shift()` or mutate the events array.
- **Strict Typing**: Avoid `any` and `eslint-disable`, especially in engine code and tests.
- **Multiplayer UI Guards**: Any engine V2 UI controls must be `disabled/hidden` when `multiplayerRole != null`.
- **Micro-Iterations**: Make the smallest possible PRs/commits. Minimum files, minimum diff, single goal.
</hard_constraints>

### Parity Testing Methodology
Parity testing is our golden standard for the Engine V2 migration.
1. When planning the migration of a remaining mechanic (e.g., AoE weapons, Enemy AI), the **first step** must always be creating `enginev2_[feature]_parity.test.ts`.
2. Do not write new V2 logic until you have written a parity test that runs V1 with `MockRng`, records the script, and explicitly requires V2 to produce the exact same behavior (hash matching, event parity).

### Micro-Iterations and "Occam's Razor" (Single Goal PRs)
When using the `subagent-driven-development` skill or working iteratively:
1. Break down broad tasks ("Implement Shooting for V2") into atomic steps ("4.2A: Hit Roll", "4.2B: Damage Roll", "4.2C: Stun/Implants").
2. Focus AI agents strictly on one atomic step per task to prevent hallucination, context overflow, and to ensure code remains easy to review.

### Context Hydration (Standard Template)
When delegating work to subagents for Engine V2, structure the prompt to include exact context:
- State the exact architecture primitives in use (`EngineBattleState`, `EngineLogEntry`, `BattleAction`, `BattleEvent`).
- Outline the sequence of operations (e.g., Phase -> Action -> Result -> Hash).
- Include current status and known workarounds explicitly to avoid redundant discoveries.
