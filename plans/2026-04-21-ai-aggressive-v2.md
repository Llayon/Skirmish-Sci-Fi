# Basic Enemy AI Implementation Plan (Engine V2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement deterministic decision-making for Aggressive and Rampaging enemy types, including pure pathfinding.

**Architecture:** 
- `services/engine/utils/pathfinding.ts`: Low-level A* logic for the grid.
- `services/engine/battle/ai/`: Modular AI logic for different profiles.
- Pure functions taking `EngineBattleState` and returning `BattleAction[]`.

**Tech Stack:** TypeScript, Vitest.

---

### Task 1: Pathfinding Utility

**Files:**
- Create: `services/engine/utils/pathfinding.ts`
- Create: `services/engine/utils/pathfinding.test.ts`

- [ ] **Step 1: Implement getShortestPath(state, from, to)**
- [ ] **Step 2: Verify with unit tests (Red-Green)**
- [ ] **Step 3: Commit**
`git add services/engine/utils/pathfinding.*`
`git commit -m "feat(engine): add deterministic A* pathfinding utility"`

---

### Task 2: Aggressive AI

**Files:**
- Create: `services/engine/battle/ai/aggressiveAI.ts`
- Create: `tests/scenarios/parity/enginev2_ai_aggressive_parity.test.ts`

- [ ] **Step 1: Write failing parity test for Aggressive behavior**
- [ ] **Step 2: Implement generateAggressiveAIPlan**
- [ ] **Step 3: Verify Green Phase**
- [ ] **Step 4: Commit**
`git add services/engine/battle/ai/aggressiveAI.ts tests/scenarios/parity/enginev2_ai_aggressive_parity.test.ts`
`git commit -m "feat(engine): implement Aggressive AI logic"`

---

### Task 3: Rampaging AI

**Files:**
- Create: `services/engine/battle/ai/rampagingAI.ts`

- [ ] **Step 1: Implement generateRampagingAIPlan**
- [ ] **Step 2: Add unit tests**
- [ ] **Step 3: Commit**
`git commit -m "feat(engine): implement Rampaging AI logic"`
