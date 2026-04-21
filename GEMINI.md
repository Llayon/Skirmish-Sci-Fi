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
