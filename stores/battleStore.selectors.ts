import type { BattleState } from './battleStore';

export const selectPendingEvents = (state: Pick<BattleState, 'events' | 'eventCursor'>) =>
  state.events.slice(state.eventCursor);

export const selectCurrentEvent = (state: Pick<BattleState, 'events' | 'eventCursor'>) =>
  state.events[state.eventCursor] ?? null;

export const selectHasPendingEvents = (state: Pick<BattleState, 'events' | 'eventCursor'>) =>
  state.eventCursor < state.events.length;

export const selectEventCursorProgress = (state: Pick<BattleState, 'events' | 'eventCursor'>) => ({
  cursor: state.eventCursor,
  total: state.events.length,
});

/**
 * Get the last computed state hash (for debug/resync).
 */
export const selectLastEngineStateHash = (state: Pick<BattleState, 'lastEngineStateHash'>) =>
  state.lastEngineStateHash;

/**
 * Get the full action log (for replay).
 */
export const selectEngineActionLog = (state: Pick<BattleState, 'engineActionLog'>) =>
  state.engineActionLog;

/**
 * Check if Engine V2 is enabled.
 */
export const selectEngineV2Enabled = (state: Pick<BattleState, 'engineV2Enabled'>) =>
  state.engineV2Enabled;

/**
 * Get action log length (for progress indicators).
 */
export const selectEngineActionCount = (state: Pick<BattleState, 'engineActionLog'>) =>
  state.engineActionLog.length;

export const selectBattlePhase = (state: Pick<BattleState, 'battle'>) =>
  state.battle?.phase;

export const selectRound = (state: Pick<BattleState, 'battle'>) =>
  state.battle?.round;

export const selectActiveParticipantId = (state: Pick<BattleState, 'battle'>) =>
  state.battle?.activeParticipantId;

export const selectTurnIndex = (state: Pick<BattleState, 'battle'>) =>
  state.battle?.currentTurnIndex;

export const selectTurnOrders = (state: Pick<BattleState, 'battle'>) => {
  if (!state.battle) return null;
  return {
    quick: state.battle.quickActionOrder.length,
    slow: state.battle.slowActionOrder.length,
    enemy: state.battle.enemyTurnOrder.length,
  };
};

export const selectRngCursor = (state: Pick<BattleState, 'rng'>) =>
  state.rng?.cursor;

export const selectQuickOrderCount = (state: Pick<BattleState, 'battle'>) => 
  state.battle?.quickActionOrder.length ?? 0;

export const selectSlowOrderCount = (state: Pick<BattleState, 'battle'>) => 
  state.battle?.slowActionOrder.length ?? 0;

export const selectEnemyOrderCount = (state: Pick<BattleState, 'battle'>) => 
  state.battle?.enemyTurnOrder.length ?? 0;

export const selectEventCursor = (state: Pick<BattleState, 'eventCursor'>) => 
  state.eventCursor;

export const selectEventTotal = (state: Pick<BattleState, 'events'>) => 
  state.events.length;
