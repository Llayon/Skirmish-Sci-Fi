# Cautious & Tactical Enemy AI Implementation Plan (Engine V2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement intelligent, deterministic decision-making for Cautious and Tactical enemy types, focusing on cover-seeking and distance management.

**Architecture:** 
- `services/engine/battle/rules/visibilityRules.ts`: Rule for determining if a cell grants cover.
- `services/engine/battle/ai/`: Modular implementation of Cautious and Tactical profiles.
- Pure scoring algorithm to evaluate reachable cells for movement.

**Tech Stack:** TypeScript, Vitest.

---

### Task 1: Cover Evaluation

**Files:**
- Modify: `services/engine/battle/rules/visibilityRules.ts`
- Create: `services/engine/battle/rules/visibilityRules.test.ts`

- [ ] **Step 1: Implement isCellInCover(state, cell, attackerPos)**
- [ ] **Step 2: Verify with unit tests**
- [ ] **Step 3: Commit**
`git add services/engine/battle/rules/visibilityRules.*`
`git commit -m "feat(engine): implement pure cover evaluation rule"`

---

### Task 2: AI Scoring Utilities

**Files:**
- Create: `services/engine/battle/ai/complexAIUtils.ts`

- [ ] **Step 1: Implement evaluateMovementOptions(state, actorId, targetId, weights)**
- [ ] **Step 2: Commit**
`git add services/engine/battle/ai/complexAIUtils.ts`
`git commit -m "feat(engine): add weighted cell scoring logic for complex AI"`

---

### Task 3: Cautious & Tactical Implementation

**Files:**
- Create: `services/engine/battle/ai/cautiousAI.ts`
- Create: `services/engine/battle/ai/tacticalAI.ts`

- [ ] **Step 1: Implement generateCautiousAIPlan**
- [ ] **Step 2: Implement generateTacticalAIPlan**
- [ ] **Step 3: Add unit tests**
- [ ] **Step 4: Commit**
`git add services/engine/battle/ai/cautiousAI.ts services/engine/battle/ai/tacticalAI.ts`
`git commit -m "feat(engine): implement Cautious and Tactical AI logic"`
