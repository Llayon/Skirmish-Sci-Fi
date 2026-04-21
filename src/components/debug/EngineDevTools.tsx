import { useState } from 'react';
import { useBattleStore } from '@/stores/battleStore';
import { useMultiplayerStore } from '@/stores/multiplayerStore';
import { useShallow } from 'zustand/react/shallow';
import {
  selectEngineV2Enabled,
  selectBattlePhase,
  selectRound,
  selectActiveParticipantId,
  selectTurnIndex,
  selectRngCursor,
  selectLastEngineStateHash,
  selectEngineActionCount,
  selectCurrentEvent,
  selectQuickOrderCount,
  selectSlowOrderCount,
  selectEnemyOrderCount,
  selectEventCursor,
  selectEventTotal,
} from '@/stores/battleStore.selectors';
import type { EngineVerifyResult } from '@/services/engine/battle/types';

export function EngineDevTools() {
  // Render condition
  const isDev = import.meta.env.DEV;
  const isDebug = import.meta.env.VITE_ENGINE_DEBUG === 'true';
  if (!isDev && !isDebug) return null;

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [verifyResult, setVerifyResult] = useState<EngineVerifyResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const {
    engineV2Enabled,
    phase,
    round,
    activeParticipantId,
    turnIndex,
    rngCursor,
    lastHash,
    actionCount,
    eventCursor,
    eventTotal,
    animatingParticipantId,
    animation,
    actions,
    battle,
    rng,
    quickOrderCount,
    slowOrderCount,
    enemyOrderCount,
  } = useBattleStore(useShallow((state) => ({
    engineV2Enabled: selectEngineV2Enabled(state),
    phase: selectBattlePhase(state),
    round: selectRound(state),
    activeParticipantId: selectActiveParticipantId(state),
    turnIndex: selectTurnIndex(state),
    rngCursor: selectRngCursor(state),
    lastHash: selectLastEngineStateHash(state),
    actionCount: selectEngineActionCount(state),
    eventCursor: selectEventCursor(state),
    eventTotal: selectEventTotal(state),
    animatingParticipantId: state.animatingParticipantId,
    animation: state.animation,
    actions: state.actions,
    battle: state.battle,
    rng: state.rng,
    quickOrderCount: selectQuickOrderCount(state),
    slowOrderCount: selectSlowOrderCount(state),
    enemyOrderCount: selectEnemyOrderCount(state),
  })));

  const currentEvent = useBattleStore(selectCurrentEvent);

  const {
    setEngineV2Enabled,
    dispatchEngineAction,
    verifyEngineReplay,
    replayAndApplyEngine,
    resetEventStream,
    resetEngineTracking,
  } = actions;

  const multiplayerRole = useMultiplayerStore((state) => state.multiplayerRole);
  const isMultiplayer = multiplayerRole !== null;
  const controlsDisabled = !battle || !rng || isMultiplayer || !engineV2Enabled;

  const handleAction = (action: () => void) => {
    try {
      setLastError(null);
      action();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setLastError(message);
      console.error(err);
    }
  };

  const verifyReplay = () => {
    try {
        setLastError(null);
        const result = verifyEngineReplay();
        setVerifyResult(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setLastError(message);
    }
  }

  if (isCollapsed) {
    return (
      <div className="fixed bottom-3 right-3 z-[9999]">
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-surface-raised text-text-base px-2 py-1 rounded text-xs border border-surface-muted"
        >
          Engine V2 DevTools
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-3 right-3 z-[9999] w-80 bg-surface-base/90 backdrop-blur border border-surface-muted rounded-lg shadow-xl text-xs font-mono text-text-base p-2 flex flex-col gap-2 max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center border-b border-surface-muted pb-1">
        <span className="font-bold text-primary">Engine V2 DevTools</span>
        <button onClick={() => setIsCollapsed(true)} className="text-text-secondary hover:text-text-base">▼</button>
      </div>

      {lastError && (
        <div className="bg-danger/10 text-danger p-1 rounded border border-danger break-words">
          Error: {lastError}
        </div>
      )}

      {/* State Overview */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        <div className="text-text-secondary">Enabled:</div>
        <div className={engineV2Enabled ? 'text-success' : 'text-danger'}>
          {String(engineV2Enabled)}
        </div>
        
        <div className="text-text-secondary">Phase:</div>
        <div>{phase || '-'}</div>

        <div className="text-text-secondary">Round:</div>
        <div>{round ?? '-'}</div>

        <div className="text-text-secondary">Active:</div>
        <div className="truncate" title={activeParticipantId || ''}>{activeParticipantId || '-'}</div>

        <div className="text-text-secondary">Turn Idx:</div>
        <div>{turnIndex ?? '-'}</div>

        <div className="text-text-secondary">Orders:</div>
        <div>
          Q:{quickOrderCount} E:{enemyOrderCount} S:{slowOrderCount}
        </div>

        <div className="text-text-secondary">RNG Cursor:</div>
        <div>{rngCursor ?? '-'}</div>

        <div className="text-text-secondary">State Hash:</div>
        <div className="font-mono text-[10px] truncate" title={lastHash || ''}>{lastHash || '-'}</div>

        <div className="text-text-secondary">Actions:</div>
        <div>{actionCount}</div>

        <div className="text-text-secondary">Events:</div>
        <div>{eventCursor} / {eventTotal}</div>

        <div className="text-text-secondary">Animating:</div>
        <div className="truncate" title={animatingParticipantId || ''}>{animatingParticipantId || '-'}</div>

        <div className="text-text-secondary">Anim Type:</div>
        <div>{animation?.type ?? '-'}</div>

        <div className="text-text-secondary">Anim ID:</div>
        <div className="truncate" title={animation?.id ?? ''}>{animation?.id ?? '-'}</div>
      </div>

      {/* Current Event Preview */}
      <div className="border-t border-surface-muted pt-1">
        <div className="text-text-secondary mb-1">Current Event:</div>
        <pre className="bg-black/20 p-1 rounded overflow-x-auto text-[10px] h-16">
            {currentEvent ? JSON.stringify(currentEvent, null, 2) : 'null'}
        </pre>
      </div>

      {/* Controls */}
      <div className="border-t border-surface-muted pt-1 flex flex-col gap-1">
        {isMultiplayer && (
           <div className="text-text-secondary text-center italic">
             Engine V2 controls disabled in multiplayer
           </div>
        )}
        
        <button
           className={`px-2 py-1 rounded border ${engineV2Enabled ? 'bg-success/10 border-success' : 'bg-danger/10 border-danger'}`}
           onClick={() => setEngineV2Enabled(!engineV2Enabled)}
           disabled={isMultiplayer}
        >
          Toggle Engine V2
        </button>

        <div className="grid grid-cols-2 gap-1">
            <button
                className="bg-surface-raised border border-surface-muted rounded px-2 py-1 hover:bg-surface-raised/80 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={controlsDisabled || phase !== 'reaction_roll'}
                onClick={() => handleAction(() => dispatchEngineAction({ type: 'ROLL_INITIATIVE' }))}
            >
                Roll Init
            </button>
             <button
                className="bg-surface-raised border border-surface-muted rounded px-2 py-1 hover:bg-surface-raised/80 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={controlsDisabled || !['quick_actions', 'enemy_actions', 'slow_actions'].includes(phase || '')}
                onClick={() => handleAction(() => dispatchEngineAction({ type: 'ADVANCE_PHASE' }))}
            >
                Next Phase
            </button>
        </div>

        <button
            className="bg-surface-raised border border-surface-muted rounded px-2 py-1 hover:bg-surface-raised/80 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={controlsDisabled || !activeParticipantId}
            onClick={() => handleAction(() => dispatchEngineAction({ type: 'END_TURN', participantId: activeParticipantId || undefined }))}
        >
            End Turn
        </button>

        <div className="grid grid-cols-2 gap-1 mt-1">
             <button
                className="bg-surface-raised border border-surface-muted rounded px-2 py-1 hover:bg-surface-raised/80 disabled:opacity-50"
                disabled={controlsDisabled}
                onClick={verifyReplay}
            >
                Verify Replay
            </button>
            <button
                className="bg-surface-raised border border-surface-muted rounded px-2 py-1 hover:bg-surface-raised/80 disabled:opacity-50"
                disabled={controlsDisabled}
                onClick={() => handleAction(() => replayAndApplyEngine())}
            >
                Replay & Apply
            </button>
        </div>

        {verifyResult && (
            <pre className={`text-[10px] p-1 rounded border overflow-x-auto ${verifyResult.ok ? 'bg-success/10 border-success' : 'bg-danger/10 border-danger'}`}>
                {JSON.stringify(verifyResult, null, 2)}
            </pre>
        )}

        <div className="grid grid-cols-2 gap-1 mt-1">
            <button
                className="bg-surface-raised border border-surface-muted rounded px-2 py-1 hover:bg-surface-raised/80 disabled:opacity-50"
                disabled={controlsDisabled}
                onClick={() => handleAction(() => resetEventStream())}
            >
                Reset Events
            </button>
             <button
                className="bg-surface-raised border border-surface-muted rounded px-2 py-1 hover:bg-surface-raised/80 disabled:opacity-50"
                disabled={controlsDisabled}
                onClick={() => handleAction(() => resetEngineTracking())}
            >
                Reset Track
            </button>
        </div>
      </div>
    </div>
  );
}
