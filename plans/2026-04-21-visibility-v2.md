# Deterministic Line of Sight Implementation Plan (Engine V2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a pure, deterministic `hasLineOfSight` function for Engine V2 using the Supercover algorithm, ensuring 100% parity with V1 for terrain blocking.

**Architecture:** 
- `services/engine/utils/raycast.ts`: Low-level math for grid traversal (Supercover).
- `services/engine/battle/rules/visibilityRules.ts`: High-level game rule considering terrain types.
- `tests/scenarios/parity/enginev2_visibility_parity.test.ts`: Parity verification suite.

**Tech Stack:** TypeScript, Vitest.

---

### Task 1: Failing Parity Test (Red Phase)

**Files:**
- Create: `tests/scenarios/parity/enginev2_visibility_parity.test.ts`

- [ ] **Step 1: Write the failing parity test**
```typescript
import { describe, it, expect } from 'vitest';
import { hasLineOfSight as hasLoSV1 } from '@/services/gridUtils';
// @ts-ignore - will be created in Task 3
import { hasLineOfSight as hasLoSV2 } from '@/services/engine/battle/rules/visibilityRules';

describe('LoS Parity (V1 vs V2)', () => {
    it('Scenario 1: Horizontal blocking wall', () => {
        // Setup state...
    });
});
```

- [ ] **Step 2: Commit**
`git add tests/scenarios/parity/enginev2_visibility_parity.test.ts`
`git commit -m "test(parity): add failing LoS parity test"`

---

### Task 2: Raycast Utility (Supercover)

**Files:**
- Create: `services/engine/utils/raycast.ts`

- [ ] **Step 1: Implement `getRayCells`**
Implement the Supercover algorithm to find all cells a line passes through.

- [ ] **Step 2: Commit**
`git add services/engine/utils/raycast.ts`
`git commit -m "feat(engine): add supercover raycast utility"`

---

### Task 3: Visibility Rule

**Files:**
- Create: `services/engine/battle/rules/visibilityRules.ts`

- [ ] **Step 1: Implement `hasLineOfSight`**
Check each cell from `getRayCells` against `state.battle.terrain`.

- [ ] **Step 2: Run tests and verify parity (Green Phase)**

- [ ] **Step 3: Commit**
`git add services/engine/battle/rules/visibilityRules.ts`
`git commit -m "feat(engine): implement deterministic LoS rule"`

---

### Task 4: Final Polish

- [ ] **Step 1: Verify Hard Constraints (Lint)**
- [ ] **Step 2: Final Commit**
`git commit -m "fix(engine): resolve any LoS parity discrepancies"`
