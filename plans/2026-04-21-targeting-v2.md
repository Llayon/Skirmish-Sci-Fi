# Deterministic Enemy Targeting Implementation Plan (Engine V2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a pure, deterministic `findBestTarget` function for Engine V2, following the priority: Lowest TN > Minimum Distance > Seeded RNG.

**Architecture:** 
- `services/engine/battle/rules/targetingRules.ts`: Pure logic for target evaluation.
- Integration with `hasLineOfSight` for visibility checks.
- Integration with `RngState` for tie-breaking.

**Tech Stack:** TypeScript, Vitest.

---

### Task 1: Targeting Unit Tests (Red Phase)

**Files:**
- Create: `services/engine/battle/rules/targetingRules.test.ts`

- [ ] **Step 1: Write failing tests for targeting priorities**
- [ ] **Step 2: Run tests and verify failure**
- [ ] **Step 3: Commit**
`git add services/engine/battle/rules/targetingRules.test.ts`
`git commit -m "test(engine): add failing targeting rules tests"`

---

### Task 2: Core Targeting Implementation

**Files:**
- Create: `services/engine/battle/rules/targetingRules.ts`

- [ ] **Step 1: Implement `findBestTarget`**
- [ ] **Step 2: Run tests and verify Green Phase**
- [ ] **Step 3: Commit**
`git add services/engine/battle/rules/targetingRules.ts`
`git commit -m "feat(engine): implement deterministic targeting logic"`

---

### Task 4: Parity Check

**Files:**
- Create: `tests/scenarios/parity/enginev2_targeting_parity.test.ts`

- [ ] **Step 1: Compare V2 results with V1 battleDomain logic**
- [ ] **Step 2: Commit**
`git add tests/scenarios/parity/enginev2_targeting_parity.test.ts`
`git commit -m "test(parity): verify targeting parity"`
