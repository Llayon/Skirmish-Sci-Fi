# Reconnect Delta Sync Implementation Plan (Stage 6E)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an efficient Delta Sync mechanism for multiplayer reconnections using the deterministic action log.

**Architecture:** 
- Enhanced `engineActionLog` to store resulting hashes for every step.
- New network handshake: `ENGINE_SYNC_REQUEST` (Guest) -> `ENGINE_DELTA_SYNC` or `ENGINE_SNAPSHOT_SYNC` (Host).
- Seamless integration with existing `replayBattle` and `hashEngineBattleState`.

**Tech Stack:** TypeScript, Zustand, Immer.

---

### Task 1: Message Definitions

**Files:**
- Modify: `services/multiplayerService.ts`

- [ ] **Step 1: Add message types**
```typescript
| { type: 'ENGINE_SYNC_REQUEST'; payload: { lastAppliedSeq: number; lastKnownHash: string } }
| { type: 'ENGINE_DELTA_SYNC'; payload: { startSeq: number; actions: BattleAction[]; finalHash: string } }
```

- [ ] **Step 2: Commit**
`git add services/multiplayerService.ts`
`git commit -m "feat(network): add delta sync message types"`

---

### Task 2: Enhanced Host Action Log

**Files:**
- Modify: `stores/battleStore.ts`

- [ ] **Step 1: Update engineActionLog structure to store hashes (optional but recommended for speed)**
- [ ] **Step 2: Implement delta selection logic on Host**
- [ ] **Step 3: Commit**
`git add stores/battleStore.ts`
`git commit -m "feat(engine): enhance action log with hash tracking"`

---

### Task 3: Sync Handshake Integration

**Files:**
- Modify: `stores/battleStore.ts`
- Modify: `services/multiplayerService.ts`

- [ ] **Step 1: Handle ENGINE_SYNC_REQUEST on Host**
- [ ] **Step 2: Handle ENGINE_DELTA_SYNC on Guest**
- [ ] **Step 3: Commit**
`git add .`
`git commit -m "feat(multiplayer): implement sync handshake and delta application"`

---

### Task 4: Verification

**Files:**
- Create: `tests/scenarios/multiplayer/enginev2_reconnect_delta_sync.test.ts`

- [ ] **Step 1: Write integration test for successful delta catch-up**
- [ ] **Step 2: Write test for snapshot fallback on hash mismatch**
- [ ] **Step 3: Commit**
`git add tests/`
`git commit -m "test(multiplayer): verify delta sync and fallback logic"`
