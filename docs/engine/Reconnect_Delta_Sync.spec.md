# Specification: Stage 6E - Reconnect Delta Sync (Engine V2)

**Goal**: Implement an efficient way for multiplayer guests to catch up after a reconnect or hash mismatch by sending only missing actions instead of full state snapshots.

---

## 1. Architectural Concept
Instead of a "Fat Snapshot", we use the **Action Log** as the source of truth for synchronization.

### Flow:
1. **Detection**: Guest reconnects or detects a `hash_mismatch`.
2. **Handshake**: Guest sends its `lastAppliedSeq` and `lastKnownHash`.
3. **Delta Evaluation (Host)**:
   - If Host has the full log starting from `lastAppliedSeq + 1`.
   - AND the Guest's `lastKnownHash` matches the Host's recorded hash at that sequence.
   - **THEN**: Host sends `ENGINE_DELTA_SYNC` (array of missing actions).
4. **Recovery (Guest)**:
   - Guest receives actions.
   - Guest uses `replayBattle` to apply actions sequentially.
   - Guest verifies final `stateHash`.
5. **Fallback**: If Host cannot provide delta (log too old or hash mismatch at baseline), send a full `ENGINE_SNAPSHOT_SYNC`.

---

## 2. New Network Messages
### `ENGINE_SYNC_REQUEST` (Guest -> Host)
```typescript
{
    lastAppliedSeq: number,
    lastKnownHash: string
}
```

### `ENGINE_DELTA_SYNC` (Host -> Guest)
```typescript
{
    startSeq: number,
    actions: BattleAction[],
    finalHash: string
}
```

---

## 3. Implementation Requirements
- **Persistence**: Host must maintain a stable `engineActionLog` in the store.
- **Verification**: Guest must verify the hash after replaying the delta.
- **Purity**: Delta application must use the pure `replayBattle` utility.

## 4. Verification Scenarios (Parity/Integration)
- **Scenario 1**: Guest missed 2 actions. Host sends delta. Guest catches up and hashes match.
- **Scenario 2**: Guest hash mismatch at Seq 5. Host detects and forces full snapshot fallback.
