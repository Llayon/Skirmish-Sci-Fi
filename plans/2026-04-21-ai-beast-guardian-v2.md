# Beast & Guardian Enemy AI Implementation Plan (Engine V2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement specialized deterministic decision-making for Beast and Guardian enemy types, following the stalking and tethering behaviors from the rulebook.

**Architecture:** 
- `services/engine/battle/ai/beastAI.ts`: Predictable stalking logic using extreme cover weights.
- `services/engine/battle/ai/guardianAI.ts`: Tethering logic to follow and mimic a Lead participant.
- Reuse of `evaluateMovementOptions` for optimized cell selection.

**Tech Stack:** TypeScript, Vitest.

---

### Task 1: Beast AI

**Files:**
- Create: `services/engine/battle/ai/beastAI.ts`
- Create: `services/engine/battle/ai/beastAI.test.ts`

- [ ] **Step 1: Implement generateBeastAIPlan**
- [ ] **Step 2: Add unit tests for stalking vs charging**
- [ ] **Step 3: Commit**
`git add services/engine/battle/ai/beastAI.*`
`git commit -m "feat(engine): implement Beast AI logic"`

---

### Task 2: Guardian AI

**Files:**
- Create: `services/engine/battle/ai/guardianAI.ts`
- Create: `services/engine/battle/ai/guardianAI.test.ts`

- [ ] **Step 1: Implement generateGuardianAIPlan**
- [ ] **Step 2: Add unit tests for tethering behavior**
- [ ] **Step 3: Commit**
`git add services/engine/battle/ai/guardianAI.*`
`git commit -m "feat(engine): implement Guardian AI logic"`
