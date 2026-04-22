# AI Integration Implementation Plan (Engine V2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate all deterministic AI profiles into the core battle reducer, allowing automated enemy turns in Engine V2.

**Architecture:** 
- `services/engine/battle/ai/aiDispatcher.ts`: Central entry point for all AI profiles.
- `services/engine/battle/reduceBattle.ts`: High-level `PROCESS_AI_TURN` action that executes a generated AI plan.
- Sequential action processing within the reducer to ensure all events and logs are captured.

**Tech Stack:** TypeScript, Immer, Vitest.

---

### Task 1: AI Dispatcher

**Files:**
- Create: `services/engine/battle/ai/aiDispatcher.ts`

- [ ] **Step 1: Implement generateAIPlan**
- [ ] **Step 2: Verify with a basic unit test**
- [ ] **Step 3: Commit**
`git add services/engine/battle/ai/aiDispatcher.ts`
`git commit -m "feat(engine): add central AI dispatcher for profile routing"`

---

### Task 2: Reducer Action

**Files:**
- Modify: `services/engine/battle/types.ts`
- Modify: `services/engine/battle/reduceBattle.ts`

- [ ] **Step 1: Add PROCESS_AI_TURN to BattleAction**
- [ ] **Step 2: Implement logic in reduceBattle to execute plan sequentially**
- [ ] **Step 3: Commit**
`git add .`
`git commit -m "feat(engine): implement PROCESS_AI_TURN reducer action"`

---

### Task 3: Verification

**Files:**
- Create: `tests/scenarios/parity/enginev2_ai_integration.test.ts`

- [ ] **Step 1: Write integration test for a full AI turn**
- [ ] **Step 2: Verify events and state changes**
- [ ] **Step 3: Commit**
`git add tests/scenarios/parity/enginev2_ai_integration.test.ts`
`git commit -m "test(integration): verify automated AI turn execution"`
