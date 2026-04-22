# Specification: AI Integration (Engine V2)

**Goal**: Integrate deterministic AI profiles into the main battle loop, allowing the engine to automatically generate and execute actions for enemy participants.

---

## 1. Architectural Flow
The AI integration follows a "Plan-then-Execute" pattern to maintain purity and support multiplayer replayability.

1. **Trigger**: The battle phase transitions to `enemy_actions` (or a specific enemy's turn).
2. **Plan Generation**: The engine calls `aiDispatcher` to get a list of `BattleAction`s for the current actor.
3. **Action Execution**: The engine processes each action in the plan sequentially through `reduceBattle`.
4. **State Update**: The final state, events, and logs are returned.

## 2. The AI Dispatcher
A central router that maps `participant.ai` type to the corresponding implementation.

```typescript
export function generateAIPlan(
    state: EngineBattleState,
    actorId: string,
    deps: EngineDeps
): { actions: BattleAction[], nextRng: RngState }
```

## 3. New Engine Action: `PROCESS_AI_TURN`
Instead of calling AI from the UI, we add a high-level action to the reducer.

**Action Payload**:
```typescript
{ type: 'PROCESS_AI_TURN', participantId: string }
```

**Reducer Logic**:
1. Identify the actor.
2. Call `generateAIPlan`.
3. For each action in the generated plan:
   - Recursively (or iteratively) call `dispatchAction(state, action, deps)`.
4. Accumulate all events and logs.

## 4. Determinism & Multiplayer
- **Action Logging**: The entire generated `AIActionPlan` is recorded in the `actionLog`.
- **Sync**: Clients do not run AI independently. The **Host** generates the plan, executes it, and sends the resulting actions/hash to **Guests**.
- **Replay**: Guests apply the same actions to verify the state hash.

## 5. UI Integration (Event Stream)
The UI `useBattleEventConsumer` will receive a burst of events (Move -> Shoot -> Damage) and must play them sequentially to provide a smooth experience.

---

## 6. Implementation Roadmap
- [ ] Create `services/engine/battle/ai/aiDispatcher.ts`.
- [ ] Update `services/engine/battle/types.ts` with `PROCESS_AI_TURN`.
- [ ] Update `services/engine/battle/reduceBattle.ts` to handle AI turns.
- [ ] Implement automated AI triggering in `stores/battleStore.ts`.
- [ ] Verify with `enginev2_ai_integration.test.ts`.
