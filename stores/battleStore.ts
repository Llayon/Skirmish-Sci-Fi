import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Battle, PlayerAction, AnimationState, MissionType, Crew, Campaign, Position } from '../types';
import { useCampaignProgressStore } from './campaignProgressStore';
import { useCrewStore } from './crewStore';
import { useUiStore } from './uiStore';
import { useMultiplayerStore } from './multiplayerStore';
import { battleUseCases } from '../services';
import { logger } from '../services/utils/logger';
import { useShipStore } from './shipStore';
import { multiplayerService } from '@/services/multiplayerService';
import { EnemyEncounterCategory } from '@/constants/enemyEncounters';
import type { BattleEvent, EngineLogEntry, BattleAction, EngineBattleState, EngineVerifyResult, EngineSnapshot } from '@/services/engine/battle/types';
import { CURRENT_ENGINE_SCHEMA_VERSION } from '@/services/engine/battle/types';
import type { RngState } from '@/services/engine/rng/rng';
import { createRng, d6, d100 } from '@/services/engine/rng/rng';
import { reduceBattle } from '@/services/engine/battle/reduceBattle';
import { hashEngineBattleState } from '@/services/engine/battle/hashEngineBattleState';
import { replayBattle } from '@/services/engine/battle/replayBattle';

// Stage 6E.2: Host Persistence Structure
export type PersistedHostSession = {
  schemaVersion: number;
  battleId: string;
  baseline: EngineBattleState;
  baselineHash: string;
  lastSeq: number;
  lastHash: string;
  actionLog: Array<{ seq: number; action: BattleAction; resultingHash: string; clientActionId?: string }>;
  savedAt: number;
};

// Host Persistence Helpers
const getHostSessionKey = (battleId: string) => `enginev2:hostSession:${battleId}`;

const saveHostSession = (session: PersistedHostSession) => {
  try {
    localStorage.setItem(getHostSessionKey(session.battleId), JSON.stringify(session));
  } catch (e) {
    logger.warn('Failed to save host session (quota?)', e);
  }
};

const loadHostSession = (battleId: string): PersistedHostSession | null => {
  try {
    const raw = localStorage.getItem(getHostSessionKey(battleId));
    if (!raw) return null;
    const session = JSON.parse(raw) as PersistedHostSession;
    
    // Basic validation
    if (session.schemaVersion !== CURRENT_ENGINE_SCHEMA_VERSION || session.battleId !== battleId) {
      logger.warn('Invalid or outdated host session found, discarding.');
      localStorage.removeItem(getHostSessionKey(battleId));
      return null;
    }
    return session;
  } catch (e) {
    logger.warn('Failed to load host session', e);
    return null;
  }
};

const clearHostSession = (battleId: string) => {
  try {
    localStorage.removeItem(getHostSessionKey(battleId));
  } catch (e) {
    logger.warn('Failed to clear host session', e);
  }
};

export interface BattleState {
  battle: Battle | null;
  rng: RngState | null;
  selectedParticipantId: string | null;
  hoveredParticipantId: string | null;
  camera3dCommand: { type: 'reset' } | { type: 'focus'; target: Position } | null;
  isProcessingEnemies: boolean;
  showEnemyTurnBanner: boolean;
  animation: AnimationState;
  animatingParticipantId: string | null;
  pendingActionFor: string | null;
  
  // Engine V2 Control
  engineV2Enabled: boolean;

  // Engine V2 State Tracking
  lastEngineStateHash: string | null;
  engineActionLog: BattleAction[];
  engineBaseline: EngineBattleState | null;
  engineBaselineHash: string | null;
  engineNetResyncing: boolean;
  engineNetClientActionSeq: number;
  engineNetPendingClientActionId: string | null;
  engineNetPendingPredictedHash: string | null;

  // Engine V2 Sequence & Ordering (Stage 6C)
  engineNetHostSeq: number;
  engineNetRemoteSeq: number; // Guest's view of host's last seq
  engineNetExpectedSeq: number; // Guest's expected next seq
  engineNetActionBuffer: Record<number, { battleId?: string; seq: number; action: BattleAction; resultingHash: string; clientActionId?: string }>;

  // Engine V2 Host Persistence
  // Note: we don't store the full persisted object in state, just use helpers

  // Engine V2 Event Stream
  // events: append-only, consumed via eventCursor
  // cursor advances as consumer plays events
  // engineLog separately from battle.log for engine specific events
  events: BattleEvent[];
  eventCursor: number;
  engineLog: EngineLogEntry[];

  actions: {
    setNewBattle: (battle: Battle) => void;
    setBattle: (recipe: (battle: Battle) => void) => void;
    startBattle: (options?: {
      missionType?: MissionType;
      enemyCountModifier?: number;
      hasVip?: boolean;
      isOutOfSequence?: boolean;
      sourceTravelEventId?: 'raided';
      enemyFaction?: string;
      battleType?: 'patron' | 'rival' | 'quest' | 'opportunity' | 'invasion';
      forceEnemyCategory?: EnemyEncounterCategory;
      customEnemyCount?: number;
      isRedZone?: boolean;
    }) => void;
    endBattle: () => void;
    finalizeBattleResults: () => void;
    endTurn: (characterId: string | null) => void;
    dispatchAction: (action: PlayerAction) => void;
    advancePhase: () => void;
    setSelectedParticipantId: (id: string | null) => void;
    setHoveredParticipantId: (id: string | null) => void;
    setIsProcessingEnemies: (isProcessing: boolean) => void;
    setShowEnemyTurnBanner: (show: boolean) => void;
    setAnimation: (animation: AnimationState) => void;
    setAnimatingParticipantId: (id: string | null) => void;
    clearAnimation: () => void;
    requestCameraReset: () => void;
    requestCameraFocusOn: (target: Position) => void;
    clearCameraCommand: () => void;
    sendFullBattleSync: () => void;
    resetBattle: () => void;
    processEnemyTurn: (enemyId: string) => Promise<{ animation: AnimationState; duration: number }>;
    resolveNotableSight: () => void;

    /**
     * Toggle Engine V2 mode (for dev/testing).
     * In production, controlled by VITE_ENGINE_V2 env var.
     */
    setEngineV2Enabled: (enabled: boolean) => void;

    // Engine V2 Actions
    dispatchEngineAction: (action: BattleAction, meta?: { clientActionId?: string }) => void;
    enqueueEvents: (events: BattleEvent[]) => void;
    enqueueEngineLog: (log: EngineLogEntry[]) => void;
    appendEngineResult: (r: { events: BattleEvent[]; log: EngineLogEntry[] }) => void;
    advanceEventCursor: (step?: number) => void;
    resetEventStream: () => void;
    resetEngineTracking: () => void;
    captureEngineBaseline: () => void;
    verifyEngineReplay: () => EngineVerifyResult;
    replayAndApplyEngine: () => void;
    applyEngineSnapshot: (snapshot: EngineSnapshot, seq?: number) => void;
    
    // Engine V2 Multiplayer
    applyEngineActionFromNetwork: (payload: { action: BattleAction; resultingHash: string; battleId?: string; clientActionId?: string }) => { 
    ok: boolean; 
    reason?: 'missing_state' | 'battle_id_mismatch' | 'resyncing' | 'hash_mismatch' | 'invalid_action'; 
    expected?: string; 
    actual?: string;
    errorMessage?: string;
  };
    handleEngineActionFromNetwork: (payload: { action: BattleAction; resultingHash: string; battleId?: string; clientActionId?: string; seq: number }) => { ok: boolean; mode?: 'ack' | 'applied' | 'dup_ignored' | 'buffered' | 'out_of_order_ack'; reason?: string; expected?: string | number; actual?: string | number };
    handleEngineActionRejectFromNetwork: (payload: { clientActionId: string; reason: 'invalid_action' | 'battle_id_mismatch' | 'resyncing'; battleId?: string }) => { ok: boolean; reason?: string };
    createEngineSnapshotForNetwork: () => { snapshot: EngineBattleState; hash: string; battleId?: string; seq: number } | null;
    applyEngineSnapshotFromNetwork: (payload: { snapshot: EngineBattleState; hash: string; battleId?: string; seq: number }) => void;
    
    // Host Persistence
    tryRestoreHostSession: (battleId: string) => boolean;

    // Stage 6E.3: Delta Sync
    handleEngineSyncRequestFromNetwork: (payload: { battleId: string; lastReceivedSeq: number }) => void;
    handleEngineSyncResponseFromNetwork: (payload: { 
      battleId: string; 
      startSeq: number; 
      actions: Array<{ seq: number; action: BattleAction; resultingHash: string }>; 
      snapshot?: { seq: number; snapshot: EngineBattleState; hash: string };
    }) => void;
  };
}

const initialBattleState: Omit<BattleState, 'actions'> = {
  battle: null,
  rng: null,
  selectedParticipantId: null,
  hoveredParticipantId: null,
  camera3dCommand: null,
  isProcessingEnemies: false,
  showEnemyTurnBanner: false,
  animation: null,
  animatingParticipantId: null,
  pendingActionFor: null,
  
  // Engine V2 Control
  engineV2Enabled: import.meta.env.VITE_ENGINE_V2 === 'true',

  // Engine V2 State Tracking
  lastEngineStateHash: null,
  engineActionLog: [],
  engineBaseline: null,
  engineBaselineHash: null,
  engineNetResyncing: false,
  engineNetClientActionSeq: 0,
  engineNetPendingClientActionId: null,
  engineNetPendingPredictedHash: null,

  engineNetHostSeq: 0,
  engineNetRemoteSeq: 0,
  engineNetExpectedSeq: 1,
  engineNetActionBuffer: {},

  events: [],
  eventCursor: 0,
  engineLog: [],
};

let battleUpdateDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useBattleStore = create<BattleState>()(
  immer((set, get) => ({
    ...initialBattleState,
    actions: {
      setNewBattle: (battle) =>
        set((state) => {
          state.battle = battle;
        }),
      setBattle: (recipe) => {
        set((state) => {
          if (state.battle) {
            recipe(state.battle);
            const { multiplayerRole } = useMultiplayerStore.getState();
            if (multiplayerRole === 'host') {
              if (battleUpdateDebounceTimer) clearTimeout(battleUpdateDebounceTimer);
              battleUpdateDebounceTimer = setTimeout(() => {
                const latestBattle = get().battle;
                if (latestBattle) {
                  multiplayerService.send({ type: 'BATTLE_UPDATE', payload: latestBattle });
                }
              }, 100); // 100ms debounce window
            }
            if (multiplayerRole === 'guest') {
              state.pendingActionFor = null;
            }
          }
        });
      },
      startBattle: async (options) => {
        const crew = useCrewStore.getState().crew;
        const campaignProgress = useCampaignProgressStore.getState().campaign;
        if (!crew || !campaignProgress) return;
        const { ship, stash } = useShipStore.getState();
        if (!ship || !stash) return;

        const campaign: Campaign = { ...campaignProgress, ship, stash };

        const availableMembers = crew.members.filter((m) => !m.injuries?.some((i) => i.recoveryTurns > 0));
        if (availableMembers.length === 0) {
          logger.warn('No crew members available for a mission.');
          return;
        }
        const crewForBattle: Crew = {
          ...crew,
          members: availableMembers,
        };

        let missionType = options?.missionType;
        const battleType = options?.battleType;

        const activeMission = campaign?.activeMission;
        if (activeMission && !options?.missionType) {
          missionType = activeMission.missionType;
        }
        
        const newBattle = await battleUseCases.startNewBattle({
          crew: crewForBattle,
          difficulty: campaign.difficulty,
          missionType,
          battleType,
          campaign,
          ...(options || {}),
        });

        get().actions.setNewBattle(newBattle);
        useUiStore.getState().actions.setGameMode('pre_battle_briefing');
        useCampaignProgressStore.getState().actions.updateCampaign((c) => {
          if (c) {
            c.locatedRivalId = null;
            c.activeMission = null;
          }
        });

        // Initialize Engine V2 RNG
        const seed = Date.now();
        logger.debug(`Battle started with seed: ${seed}`);
        const rng = createRng(seed);
        set((state) => {
          state.rng = rng;
        });
        get().actions.resetEventStream();
        get().actions.resetEngineTracking();
        get().actions.captureEngineBaseline();
        
        // Host Persistence: Check for recovery
        const { multiplayerRole } = useMultiplayerStore.getState();
        if (multiplayerRole === 'host' && newBattle.id) {
           const restored = get().actions.tryRestoreHostSession(newBattle.id);
           if (restored) {
               logger.info(`Host session restored for battle ${newBattle.id}`);
           } else {
               // If no session to restore, we are fresh. 
               // Baseline captured above is correct.
               // We should probably clear any stale session if ID collisions (unlikely but safe)
               clearHostSession(newBattle.id);
           }
        }
      },
      endBattle: () => {
        const { multiplayerRole } = useMultiplayerStore.getState();
        const battle = get().battle;

        if (!battle) return;

        // Host Persistence: Clear session on normal end
        if (multiplayerRole === 'host') {
            clearHostSession(battle.id);
        }

        if (multiplayerRole) {
          useMultiplayerStore.getState().actions.abortMultiplayer();
          return;
        }

        if (battle.isOutOfSequence) {
          useCampaignProgressStore.getState().actions.applyOutOfSequenceBattleRewardsAndContinue(battle);
          set(initialBattleState);
          useUiStore.getState().actions.setGameMode('dashboard');
        } else {
          useUiStore.getState().actions.setGameMode('post_battle');
        }
      },
      finalizeBattleResults: () => {
        set((state) => {
          state.battle = null;
          state.rng = null;
          state.selectedParticipantId = null;
        });
        get().actions.resetEventStream();
        get().actions.resetEngineTracking();
        useUiStore.getState().actions.setGameMode('dashboard');
      },
      endTurn: (characterId) => {
        const battle = get().battle;
        const id = characterId || battle?.activeParticipantId;
        if (id) {
          get().actions.dispatchAction({ type: 'end_turn', payload: { characterId: id } });
        }
      },
      dispatchAction: (action: PlayerAction) => {
        const { multiplayerRole } = useMultiplayerStore.getState();
        if (multiplayerRole === 'guest') {
          const characterId = (action.payload as { characterId?: string }).characterId;
          if (characterId) {
            set((state) => {
              state.pendingActionFor = characterId;
            });
          }
          multiplayerService.send({ type: 'PLAYER_ACTION', payload: action });
        } else {
          get().actions.setBattle((battle) => {
            const { logs } = battleUseCases.processPlayerAction(battle, action, multiplayerRole);
            if (logs.length > 0) {
              battle.log.push(...logs);
            }
          });
        }
      },
      advancePhase: () => {
        const { multiplayerRole } = useMultiplayerStore.getState();
        get().actions.setBattle((battle) => {
          battleUseCases.advancePhase(battle, multiplayerRole);
        });
      },
      setSelectedParticipantId: (id) =>
        set((state) => {
          state.selectedParticipantId = id;
        }),
      setHoveredParticipantId: (id) =>
        set((state) => {
          state.hoveredParticipantId = id;
        }),
      setIsProcessingEnemies: (isProcessing) =>
        set((state) => {
          state.isProcessingEnemies = isProcessing;
        }),
      setShowEnemyTurnBanner: (show) =>
        set((state) => {
          state.showEnemyTurnBanner = show;
        }),
      setAnimation: (animation) =>
        set((state) => {
          state.animation = animation;
        }),
      setAnimatingParticipantId: (id) =>
        set((state) => {
          state.animatingParticipantId = id;
        }),
      clearAnimation: () =>
        set((state) => {
          state.animation = null;
          state.animatingParticipantId = null;
        }),
      requestCameraReset: () =>
        set((state) => {
          state.camera3dCommand = { type: 'reset' };
        }),
      requestCameraFocusOn: (target) =>
        set((state) => {
          state.camera3dCommand = { type: 'focus', target };
        }),
      clearCameraCommand: () =>
        set((state) => {
          state.camera3dCommand = null;
        }),
      sendFullBattleSync: () => {
        const { battle } = get();
        const { multiplayerRole } = useMultiplayerStore.getState();
        if (battle && multiplayerRole === 'host') {
          logger.info('Host received sync request. Sending full battle state.');
          multiplayerService.send({ type: 'BATTLE_UPDATE', payload: battle });
        }
      },
      resetBattle: () => set(initialBattleState),
      processEnemyTurn: async (enemyId: string) => {
        const battle = get().battle;
        const multiplayerRole = useMultiplayerStore.getState().multiplayerRole;
        if (!battle) return { animation: null, duration: 0 };

        const { updatedBattle, animation, duration } = battleUseCases.processEnemyTurn(battle, enemyId, multiplayerRole);

        set((state) => {
          state.battle = updatedBattle;
        });

        return { animation, duration };
      },
      resolveNotableSight: () => {
        const battle = get().battle;
        if (!battle) return;
        const { notableSight, logs, updatedParticipants } = battleUseCases.resolveNotableSight(battle);
        get().actions.setBattle(b => {
            b.notableSight = notableSight;
            b.log.push(...logs);
            if (updatedParticipants) {
                updatedParticipants.forEach(updatedP => {
                    const index = b.participants.findIndex(p => p.id === updatedP.id);
                    if (index !== -1) {
                        b.participants[index] = updatedP;
                    }
                });
            }
        });
      },

      // Engine V2 Actions
      dispatchEngineAction: (action, meta?: { clientActionId?: string }) => {
        const { battle, rng, engineV2Enabled, engineNetResyncing, engineNetClientActionSeq, engineNetPendingClientActionId } = get();
        const { multiplayerRole } = useMultiplayerStore.getState();

        // Gate 1: Feature flag
        if (!engineV2Enabled) {
          logger.debug('dispatchEngineAction: engineV2 disabled, no-op');
          return;
        }

        // Gate 2: Required state
        if (!battle || !rng) {
          logger.warn('dispatchEngineAction: missing battle or rng state');
          return;
        }

        // Gate 3: Multiplayer Guest check (Optimistic)
        if (multiplayerRole === 'guest') {
          if (engineNetResyncing) {
            logger.warn('dispatchEngineAction: guest in resync, ignoring action');
            return;
          }
          if (engineNetPendingClientActionId) {
            logger.warn('dispatchEngineAction: guest has pending action, ignoring');
            return;
          }

          // Optimistic Apply
          // Ensure baseline exists
          if (!get().engineBaseline) {
             get().actions.captureEngineBaseline();
          }

          const engineState: EngineBattleState = {
            schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
            battle,
            rng
          };

          try {
            const result = reduceBattle(engineState, action, { rng: { d6, d100 } });
            const seq = engineNetClientActionSeq + 1;
            const clientActionId = battle.id ? `${battle.id}:${seq}` : `${seq}`;

            set((state) => {
               // Core state
               state.battle = result.next.battle;
               state.rng = result.next.rng;
               state.lastEngineStateHash = result.stateHash;
               state.engineActionLog.push(action);

               // Events & Log
                if (result.events.length > 0) (state.events as any).push(...result.events);
                if (result.log.length > 0) (state.engineLog as any).push(...result.log);

                // Pending state
               state.engineNetClientActionSeq = seq;
               state.engineNetPendingClientActionId = clientActionId;
               state.engineNetPendingPredictedHash = result.stateHash;
            });

            // Send PROPOSE
            multiplayerService.send({
               type: 'ENGINE_PROPOSE_ACTION',
               payload: {
                   battleId: battle.id,
                   clientActionId,
                   action,
                   predictedHash: result.stateHash
               }
            });
          } catch (e) {
            logger.warn('dispatchEngineAction: guest optimistic apply failed', e);
            set((state) => {
                state.engineNetResyncing = true;
            });
            return;
          }
          
          return;
        }

        // Build engine state
        const engineState: EngineBattleState = {
          schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
          battle,
          rng
        };

        const result = reduceBattle(engineState, action, { rng: { d6, d100 } });

        // Multiplayer Broadcast (Host Only)
        if (multiplayerRole === 'host') {
            const nextSeq = get().engineNetHostSeq + 1;
            
            // Apply Result (Atomic Update including Seq)
            set((state) => {
              // Core state
              state.battle = result.next.battle;
              state.rng = result.next.rng;
              
              // Hash tracking
              state.lastEngineStateHash = result.stateHash;

              // Action log (for replay/multiplayer)
              state.engineActionLog.push(action);

              // Event stream
              if (result.events.length > 0) {
                state.events.push(...result.events);
              }
              
              // Engine log
              if (result.log.length > 0) {
                (state.engineLog as any).push(...result.log);
              }

              // Increment Host Seq (atomically)
              state.engineNetHostSeq = nextSeq;
            });

            // Host Persistence: Save immediately
            const currentState = get();
            if (currentState.engineBaseline && currentState.engineBaselineHash && currentState.lastEngineStateHash) {
                // Improved Host Persistence: Incremental Append or Replay Rebuild
                const currentSeq = currentState.engineNetHostSeq;
                let actionLogForPersistence: Array<{ seq: number; action: BattleAction; resultingHash: string; clientActionId?: string }> = [];
                
                const existingSession = loadHostSession(battle.id);
                // Check if existing session is compatible for incremental append:
                // 1. Same baseline hash
                // 2. Its lastSeq must be exactly one less than our current seq
                const isIncremental = existingSession && 
                                      existingSession.baselineHash === currentState.engineBaselineHash && 
                                      existingSession.lastSeq === currentSeq - 1 &&
                                      existingSession.actionLog.length === currentSeq - 1;

                if (isIncremental) {
                     // Incremental Append
                     actionLogForPersistence = [
                         ...existingSession.actionLog,
                         {
                             seq: currentSeq,
                             action,
                             resultingHash: result.stateHash,
                             clientActionId: meta?.clientActionId
                         }
                     ];
                } else {
                    // Full Rebuild via Replay (Deterministic)
                    // We must regenerate hashes for ALL actions in history if we lost the chain
                    try {
                        const replayResult = replayBattle(currentState.engineBaseline, currentState.engineActionLog, { rng: { d6, d100 } });
                        
                        if (replayResult.steps.length !== currentState.engineActionLog.length) {
                            logger.error('Host Persistence: Replay mismatch during save! Clearing corrupt session.', { 
                                logLength: currentState.engineActionLog.length, 
                                replaySteps: replayResult.steps.length 
                            });
                            clearHostSession(battle.id);
                            actionLogForPersistence = [];
                        } else {
                             actionLogForPersistence = currentState.engineActionLog.map((act, i) => ({
                                 seq: i + 1,
                                 action: act,
                                 resultingHash: replayResult.steps[i].stateHash,
                                 // We lose clientActionId history on full rebuild, but preserve for current action
                                 clientActionId: (i === currentState.engineActionLog.length - 1) ? meta?.clientActionId : undefined 
                             }));
                        }
                    } catch (e) {
                        logger.error('Host Persistence: Replay failed during save! Clearing corrupt session.', e);
                        clearHostSession(battle.id);
                        actionLogForPersistence = [];
                    }
                }

                // Persist only if we have a complete chain for [1..currentSeq]
                if (actionLogForPersistence.length === currentSeq) {
                    saveHostSession({
                        schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
                        battleId: battle.id,
                        baseline: currentState.engineBaseline,
                        baselineHash: currentState.engineBaselineHash,
                        lastSeq: currentSeq,
                        lastHash: currentState.lastEngineStateHash,
                        actionLog: actionLogForPersistence,
                        savedAt: Date.now()
                    });
                } else {
                    // "валидная цепочка или ничего"
                    clearHostSession(battle.id);
                }
            }

            multiplayerService.send({
                type: 'ENGINE_ACTION',
                payload: {
                    action,
                    resultingHash: result.stateHash,
                    battleId: battle.id,
                    clientActionId: meta?.clientActionId,
                    seq: nextSeq
                }
            });
        } else {
            // Local Apply (Single Player / Guest pre-proposal)
            // Note: Guest optimistic apply is handled in the separate block above.
            // This block is for non-multiplayer local play primarily.
            set((state) => {
              // Core state
              state.battle = result.next.battle;
              state.rng = result.next.rng;
              
              // Hash tracking
              state.lastEngineStateHash = result.stateHash;

              // Action log (for replay/multiplayer)
              state.engineActionLog.push(action);

              // Event stream
              if (result.events.length > 0) {
                (state.events as any).push(...result.events);
              }
              
              // Engine log
              if (result.log.length > 0) {
                (state.engineLog as any).push(...result.log);
              }
            });
        }

        logger.debug(`Engine action dispatched: ${action.type}, hash: ${result.stateHash}`);
      },
      enqueueEvents: (events) => {
        if (events.length === 0) return;
        set((state) => {
          (state.events as any).push(...events);
        });
      },
      enqueueEngineLog: (log) => {
        if (log.length === 0) return;
        set((state) => {
          (state.engineLog as any).push(...log);
        });
      },
      appendEngineResult: (result) => {
        if (result.events.length === 0 && result.log.length === 0) return;
        set((state) => {
          (state.events as any).push(...result.events);
          (state.engineLog as any).push(...result.log);
        });
      },
      advanceEventCursor: (step = 1) =>
        set((state) => {
          if (step <= 0) return;
          state.eventCursor = Math.min(state.eventCursor + step, state.events.length);
        }),
      resetEventStream: () =>
        set((state) => {
          // Event stream
          state.events = [];
          state.eventCursor = 0;
          state.engineLog = [];
        }),
      resetEngineTracking: () =>
        set((state) => {
          // Action log & hash
          state.engineActionLog = [];
          state.lastEngineStateHash = null;
          state.engineBaseline = null;
          state.engineBaselineHash = null;
          state.engineNetResyncing = false;
          state.engineNetClientActionSeq = 0;
          state.engineNetPendingClientActionId = null;
          state.engineNetPendingPredictedHash = null;
          state.engineNetHostSeq = 0;
          state.engineNetRemoteSeq = 0;
          state.engineNetExpectedSeq = 1;
          state.engineNetActionBuffer = {};
        }),
      captureEngineBaseline: () => {
        const { battle, rng } = get();
        if (!battle || !rng) return;

        // Create detached snapshot for baseline
        // Note: using structuredClone on get() state avoids Immer proxy issues
        const battleClone = structuredClone(battle);
        const rngClone = structuredClone(rng);

        const baseline: EngineBattleState = {
          schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
          battle: battleClone,
          rng: rngClone,
        };

        const hash = hashEngineBattleState(baseline);

        set((state) => {
          state.engineBaseline = baseline;
          state.engineBaselineHash = hash;
          state.engineActionLog = [];
          
          // Also update current tracking hash to match baseline
          state.lastEngineStateHash = hash;
        });
      },
      verifyEngineReplay: () => {
        const { engineBaseline, engineActionLog, lastEngineStateHash } = get();
        
        if (!engineBaseline) {
          return { ok: false, reason: 'no_baseline' };
        }
        if (!lastEngineStateHash) {
          return { ok: false, reason: 'no_expected_hash' };
        }

        const result = replayBattle(engineBaseline, engineActionLog, { rng: { d6, d100 } });
        
        const finalHash = result.steps.length > 0 
            ? result.steps[result.steps.length - 1].stateHash 
            : hashEngineBattleState(result.final);

        if (finalHash !== lastEngineStateHash) {
          return {
            ok: false,
            reason: 'hash_mismatch',
            expectedHash: lastEngineStateHash,
            replayedHash: finalHash,
            stepsCount: engineActionLog.length
          };
        }

        return { ok: true, stepsCount: engineActionLog.length, replayedHash: finalHash };
      },
      replayAndApplyEngine: () => {
        const { engineBaseline, engineActionLog } = get();
        if (!engineBaseline) {
          logger.warn('replayAndApplyEngine: no baseline');
          return;
        }

        const result = replayBattle(engineBaseline, engineActionLog, { rng: { d6, d100 } });
        const finalHash = result.steps.length > 0 
            ? result.steps[result.steps.length - 1].stateHash 
            : hashEngineBattleState(result.final);

        set((state) => {
          state.battle = result.final.battle;
          state.rng = result.final.rng;
          state.lastEngineStateHash = finalHash;
        });
      },
      applyEngineSnapshot: (snapshot: EngineSnapshot, seq?: number) => {
        if (snapshot.schemaVersion !== CURRENT_ENGINE_SCHEMA_VERSION) {
          logger.warn(`applyEngineSnapshot: schema version mismatch (expected ${CURRENT_ENGINE_SCHEMA_VERSION}, got ${snapshot.schemaVersion})`);
          // Proceeding anyway as per requirements (warn but continue)
        }

        // Validate hash
        const engineState: EngineBattleState = {
            schemaVersion: snapshot.schemaVersion,
            battle: snapshot.battle,
            rng: snapshot.rng
        };
        const calculatedHash = hashEngineBattleState(engineState);
        if (calculatedHash !== snapshot.stateHash) {
            logger.warn(`applyEngineSnapshot: hash mismatch (snapshot says ${snapshot.stateHash}, calculated ${calculatedHash})`);
        }

        set((state) => {
            // Apply state
            state.battle = snapshot.battle;
            state.rng = snapshot.rng;
            state.lastEngineStateHash = snapshot.stateHash;

            // Set as new baseline
            state.engineBaseline = structuredClone(engineState);
            state.engineBaselineHash = snapshot.stateHash;

            // Clear history/events
            state.engineActionLog = [];
            
            // Clear UI streams
            state.events = [];
            state.eventCursor = 0;
            state.engineLog = [];
            state.engineNetResyncing = false;
            state.engineNetPendingClientActionId = null;
            state.engineNetPendingPredictedHash = null;
            
            // Set ordering state (if provided)
            if (seq !== undefined) {
                state.engineNetRemoteSeq = seq;
                state.engineNetExpectedSeq = seq + 1;
                state.engineNetActionBuffer = {};
            }
        });
      },
      
      applyEngineActionFromNetwork: (payload) => {
        const { battle, rng, engineBaseline, engineNetResyncing } = get();
        
        if (engineNetResyncing) {
            return { ok: false, reason: 'resyncing' };
        }

        if (!battle || !rng) {
            return { ok: false, reason: 'missing_state' };
        }

        if (payload.battleId && battle.id !== payload.battleId) {
            return { ok: false, reason: 'battle_id_mismatch' };
        }

        // Ensure baseline exists
        if (!engineBaseline) {
            get().actions.captureEngineBaseline();
        }

        const engineState: EngineBattleState = {
            schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
            battle,
            rng
        };

        let result;
        try {
            result = reduceBattle(engineState, payload.action, { rng: { d6, d100 } });
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            logger.warn(`applyEngineActionFromNetwork: invalid action`, e);
            
            set((state) => {
                state.engineNetResyncing = true;
            });

            return { 
                ok: false, 
                reason: 'invalid_action', 
                errorMessage 
            };
        }

        // Check hash
        if (result.stateHash !== payload.resultingHash) {
            logger.warn(`Engine Desync! Expected: ${payload.resultingHash}, Actual: ${result.stateHash}`);
            // Note: We do NOT apply the state if it mismatches, to avoid further divergence.
            // The network layer should handle this by requesting a sync.
            
            set((state) => {
                state.engineNetResyncing = true;
            });

            return { 
                ok: false, 
                reason: 'hash_mismatch', 
                expected: payload.resultingHash, 
                actual: result.stateHash 
            };
        }

        // Apply
        set((state) => {
            state.battle = result.next.battle;
            state.rng = result.next.rng;
            state.lastEngineStateHash = result.stateHash;
            state.engineActionLog.push(payload.action);

            if (result.events.length > 0) {
                (state.events as any).push(...result.events);
            }
            if (result.log.length > 0) {
                (state.engineLog as any).push(...result.log);
            }
            
            // Ensure resync flag is false on success (in case it was set momentarily or leftovers)
            state.engineNetResyncing = false;
        });

        return { ok: true };
      },

      handleEngineActionFromNetwork: (payload) => {
        const { engineNetResyncing, engineNetExpectedSeq, engineNetPendingClientActionId, lastEngineStateHash, engineNetActionBuffer } = get();

        // 1. Resync check
        if (engineNetResyncing) {
            return { ok: false, reason: 'resyncing' };
        }

        const seq = payload.seq;
        const expected = engineNetExpectedSeq;

        // 2. Duplicate/Late check
        if (seq < expected) {
             return { ok: true, mode: 'dup_ignored', expected, actual: seq };
        }

        // 3. Buffer check (Future packet)
        if (seq > expected) {
            // 3.1 Special case: Out-of-order ACK
            if (payload.clientActionId && payload.clientActionId === engineNetPendingClientActionId) {
                 logger.warn(`handleEngineActionFromNetwork: out-of-order ACK (seq ${seq} > expected ${expected}). Resyncing.`);
                 set((state) => {
                    state.engineNetResyncing = true;
                    state.engineNetPendingClientActionId = null;
                    state.engineNetPendingPredictedHash = null;
                    state.engineNetActionBuffer = {};
                 });
                 return { ok: false, reason: 'out_of_order_ack', expected, actual: seq };
            }

            // Buffer it
            set((state) => {
                state.engineNetActionBuffer[seq] = payload;
            });
            return { ok: true, mode: 'buffered', expected, actual: seq };
        }

        // 4. Process (seq === expected)
        // Helper to process a single action payload
        const processPayload = (p: typeof payload) => {
             const currentStore = get();
             // ACK Check
             if (p.clientActionId && p.clientActionId === currentStore.engineNetPendingClientActionId) {
                 if (currentStore.lastEngineStateHash === p.resultingHash) {
                     // ACK OK
                     set((state) => {
                         state.engineNetPendingClientActionId = null;
                         state.engineNetPendingPredictedHash = null;
                         state.engineNetExpectedSeq++;
                         state.engineNetRemoteSeq = p.seq;
                     });
                     return { ok: true, mode: 'ack' } as const;
                 } else {
                     // ACK Mismatch
                     set((state) => {
                         state.engineNetResyncing = true;
                         state.engineNetPendingClientActionId = null;
                         state.engineNetPendingPredictedHash = null;
                         state.engineNetActionBuffer = {};
                     });
                     return { 
                         ok: false, 
                         reason: 'hash_mismatch', 
                         expected: p.resultingHash, 
                         actual: currentStore.lastEngineStateHash ?? undefined 
                     } as const;
                 }
             }

             // Apply Authoritative
             const result = currentStore.actions.applyEngineActionFromNetwork(p);
             if (result.ok) {
                 set((state) => {
                     state.engineNetExpectedSeq++;
                     state.engineNetRemoteSeq = p.seq;
                 });
                 return { ...result, mode: 'applied' } as const;
             } else {
                 // Apply failed -> Resync
                 set((state) => {
                     state.engineNetPendingClientActionId = null;
                     state.engineNetPendingPredictedHash = null;
                     state.engineNetActionBuffer = {};
                 });
                 return { ...result, mode: 'applied' } as const;
             }
        };

        // Process current
        const result = processPayload(payload);
        if (!result.ok) return result;

        // 5. Drain Buffer
        let nextSeq = get().engineNetExpectedSeq;
        let nextPayload = get().engineNetActionBuffer[nextSeq];
        
        while (nextPayload) {
             // Remove from buffer
             set((state) => {
                 delete state.engineNetActionBuffer[nextSeq];
             });
             
             const drainResult = processPayload(nextPayload);
             if (!drainResult.ok) {
                 return drainResult;
             }
             
             nextSeq = get().engineNetExpectedSeq;
             nextPayload = get().engineNetActionBuffer[nextSeq];
        }

        return result;
      },

      handleEngineActionRejectFromNetwork: (payload) => {
         const { engineNetPendingClientActionId } = get();
         if (payload.clientActionId === engineNetPendingClientActionId) {
             set((state) => {
                 state.engineNetPendingClientActionId = null;
                 state.engineNetPendingPredictedHash = null;
                 state.engineNetResyncing = true; // Force resync as we are desynced
             });
             return { ok: true };
         }
         return { ok: false, reason: 'not_pending' };
      },

      createEngineSnapshotForNetwork: () => {
        const { battle, rng, lastEngineStateHash, engineNetHostSeq } = get();
        if (!battle || !rng) return null;

        // If we don't have a hash yet, calculate it
        let hash = lastEngineStateHash;
        if (!hash) {
            const tempState: EngineBattleState = {
                schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
                battle,
                rng
            };
            hash = hashEngineBattleState(tempState);
        }

        return {
            snapshot: {
                schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
                battle: structuredClone(battle),
                rng: structuredClone(rng)
            },
            hash,
            battleId: battle.id,
            seq: engineNetHostSeq
        };
      },

      applyEngineSnapshotFromNetwork: (payload) => {
        const { battle } = get();
        if (payload.battleId && battle && battle.id !== payload.battleId) {
            logger.warn(`applyEngineSnapshotFromNetwork: battleId mismatch (local ${battle.id}, remote ${payload.battleId})`);
            return;
        }

        // Reuse existing logic, wrapping payload
        get().actions.applyEngineSnapshot({
            schemaVersion: payload.snapshot.schemaVersion,
            battle: payload.snapshot.battle,
            rng: payload.snapshot.rng,
            stateHash: payload.hash
        }, payload.seq);
      },

      setEngineV2Enabled: (enabled) =>
        set((state) => {
          state.engineV2Enabled = enabled;
        }),

      // Host Persistence
      tryRestoreHostSession: (battleId) => {
         const session = loadHostSession(battleId);
         if (!session) return false;

         logger.info(`Restoring host session for ${battleId} (lastSeq: ${session.lastSeq})`);

         // Restore store state
         set((state) => {
             state.engineBaseline = session.baseline;
             state.engineBaselineHash = session.baselineHash;
             state.engineActionLog = session.actionLog.map(a => a.action); // Restore actions
             state.engineNetHostSeq = session.lastSeq;
             state.lastEngineStateHash = session.lastHash;
             // Don't set state.battle yet, replay will do it
         });

         // Perform replay to restore full battle state
         get().actions.replayAndApplyEngine();

         // Verify hash match
         const verify = get().actions.verifyEngineReplay();
         if (!verify.ok) {
             logger.error('Host Session Restore Failed: Replay mismatch', verify);
             // Corrupt session? Clear it and force fresh start?
             // Prompt says: "если найдено: восстановить... и сделать replay"
             // If replay fails, we probably shouldn't proceed with corrupt state.
             clearHostSession(battleId);
             get().actions.resetEngineTracking();
             return false;
         }

         return true;
      },

      handleEngineSyncRequestFromNetwork: (payload) => {
         const { battle, engineNetHostSeq, engineBaseline, engineActionLog } = get();
         const { multiplayerRole } = useMultiplayerStore.getState();

         if (multiplayerRole !== 'host' || !battle) return;
         if (battle.id !== payload.battleId) return;

         const hostLastSeq = engineNetHostSeq;
         
         // 1. Check if we need full snapshot (too far behind OR no usable delta history)
         const SYNC_THRESHOLD = 200;
         const diff = hostLastSeq - payload.lastReceivedSeq;

         const startSeq = payload.lastReceivedSeq + 1;
         const startIndex = startSeq - 1;
         const historyComplete = engineActionLog.length === hostLastSeq;
         const hasDeltaHistory = 
           historyComplete && 
           startIndex >= 0 && 
           startIndex < engineActionLog.length;

         const needsSnapshot = 
           diff > SYNC_THRESHOLD || 
           !engineBaseline || 
           payload.lastReceivedSeq < 0 || 
           (diff > 0 && !hasDeltaHistory);

         if (needsSnapshot) {
             const snapshot = get().actions.createEngineSnapshotForNetwork();
             if (snapshot) {
                 multiplayerService.send({ 
                     type: 'ENGINE_SYNC_RESPONSE', 
                     payload: {
                         battleId: battle.id,
                         startSeq: snapshot.seq,
                         actions: [],
                         snapshot
                     }
                 });
             }
             return;
         }

         // 2. Prepare Delta Actions
         // If guest is up to date (or ahead??), send nothing or empty list
         if (diff <= 0) {
              multiplayerService.send({ 
                 type: 'ENGINE_SYNC_RESPONSE', 
                 payload: {
                     battleId: battle.id,
                     startSeq: hostLastSeq, // effectively no-op
                     actions: []
                 }
             });
             return;
         }

         // Slice actions:
         // engineActionLog is array [0..N-1]
         // engineNetHostSeq corresponds to length N.
         // Action with seq K is at index K-1.
         // We need actions starting from lastReceivedSeq + 1 up to hostLastSeq.

         const actionsToSync = engineActionLog.slice(startIndex);

         // We need to provide resultingHash for each action to ensure strict verification
         // Since we don't store per-step hashes in memory, we must replay to calculate them.
         // This is a tradeoff: CPU vs Memory. For <200 actions it's fast.
         
         // Optimization: If we only send 1 action and it's the last one, we have lastEngineStateHash.
         // But for general case, we replay.
         
         let actionsWithHashes: Array<{ seq: number; action: BattleAction; resultingHash: string }> = [];
         
         try {
             // We need to replay from baseline up to the end of the slice
             // BUT wait, replayBattle returns ALL steps.
             // We can just replay everything and pick the ones we need.
             
             const replayResult = replayBattle(engineBaseline!, engineActionLog, { rng: { d6, d100 } });
             
             // Check if replay matches our expectation of log length
             if (replayResult.steps.length !== engineActionLog.length) {
                 logger.warn(`Sync: Replay length mismatch! Log: ${engineActionLog.length}, Steps: ${replayResult.steps.length}`);
                 // Fallback to snapshot if something is wrong
                 const snapshot = get().actions.createEngineSnapshotForNetwork();
                 if (snapshot) {
                     multiplayerService.send({ type: 'ENGINE_SYNC_RESPONSE', payload: { battleId: battle.id, startSeq: snapshot.seq, actions: [], snapshot } });
                 }
                 return;
             }

             // Map steps to response format
             actionsWithHashes = actionsToSync.map((action, i) => {
                 const seq = startSeq + i;
                 const stepIndex = seq - 1; // 0-based index in steps
                 const step = replayResult.steps[stepIndex];
                 return {
                     seq,
                     action,
                     resultingHash: step.stateHash
                 };
             });

         } catch (e) {
             logger.error('Sync: Replay failed during sync preparation', e);
             // Fallback to snapshot
             const snapshot = get().actions.createEngineSnapshotForNetwork();
             if (snapshot) {
                 multiplayerService.send({ type: 'ENGINE_SYNC_RESPONSE', payload: { battleId: battle.id, startSeq: snapshot.seq, actions: [], snapshot } });
             }
             return;
         }

         multiplayerService.send({
             type: 'ENGINE_SYNC_RESPONSE',
             payload: {
                 battleId: battle.id,
                 startSeq,
                 actions: actionsWithHashes
             }
         });
      },

      handleEngineSyncResponseFromNetwork: (payload) => {
          const { multiplayerRole } = useMultiplayerStore.getState();
          const battle = get().battle;

          if (multiplayerRole !== 'guest') return;
          
          if (battle && battle.id !== payload.battleId) {
              logger.warn('Sync Response: Battle ID mismatch', payload.battleId, battle.id);
              return;
          }

          set((state) => {
              // 1. Apply Snapshot if provided
              if (payload.snapshot) {
                  logger.info('Sync Response: Applying Snapshot', payload.snapshot.seq);
                  // We can use existing action but we are inside immer setter
                  // We'll duplicate logic briefly or call it outside? 
                  // Zustand/Immer allows calling actions if they are available in scope or via get()
                  // But here we are inside the reducer. We should just mutate state directly using same logic.
                  
                  // Logic from applyEngineSnapshot:
                  const snap = payload.snapshot.snapshot;
                  state.battle = snap.battle;
                  state.rng = snap.rng;
                  state.lastEngineStateHash = payload.snapshot.hash;
                  state.engineBaseline = structuredClone(snap); // Baseline is the snapshot
                  state.engineBaselineHash = payload.snapshot.hash;
                  state.engineActionLog = [];
                  state.events = [];
                  state.eventCursor = 0;
                  state.engineLog = [];
                  state.engineNetResyncing = false;
                  state.engineNetPendingClientActionId = null;
                  state.engineNetPendingPredictedHash = null;
                  
                  state.engineNetRemoteSeq = payload.snapshot.seq;
                  state.engineNetExpectedSeq = payload.snapshot.seq + 1;
                  state.engineNetActionBuffer = {};
              }

              // 2. Apply Actions
              if (payload.actions.length > 0) {
                  logger.info(`Sync Response: Applying ${payload.actions.length} actions`);
                  
                  // Sort just in case, though they should be ordered
                  const sortedActions = payload.actions.sort((a, b) => a.seq - b.seq);
                  
                  for (const item of sortedActions) {
                      // Reuse handleEngineActionFromNetwork logic logic?
                      // It's complex with buffering/ACKS.
                      // Here we are strictly applying authoritative history.
                      // We can just forcefully apply if seq matches expected.
                      
                      // If we just applied snapshot, expected is snap.seq + 1.
                      // If we didn't apply snapshot, expected should match item.seq (if we requested correctly).
                      
                      const expected = state.engineNetExpectedSeq;
                      if (item.seq !== expected) {
                          logger.warn(`Sync Response: Gap in actions! Expected ${expected}, got ${item.seq}`);
                          // If gap, we can't continue applying safely without re-requesting or buffering.
                          // But this is a SYNC response, it should be contiguous.
                          // If not, we stop here and request sync again?
                          state.engineNetResyncing = true;
                          break;
                      }

                      // Apply
                      // We can't call store.actions.applyEngineActionFromNetwork here easily because we need return values and it uses get().
                      // We have to replicate the reduce logic.
                      
                      // Check baseline
                      if (!state.engineBaseline) {
                          // Should have been captured or snapshotted.
                          // If missing, we are broken.
                          state.engineNetResyncing = true;
                          break;
                      }

                      const engineState: EngineBattleState = {
                          schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
                          battle: state.battle!,
                          rng: state.rng!
                      };

                      try {
                          const result = reduceBattle(engineState, item.action, { rng: { d6, d100 } });
                          
                          if (result.stateHash !== item.resultingHash) {
                               logger.error(`Sync Response: Hash mismatch at seq ${item.seq}`);
                               state.engineNetResyncing = true;
                               break;
                          }

                          // Update State
                          state.battle = result.next.battle;
                          state.rng = result.next.rng;
                          state.lastEngineStateHash = result.stateHash;
                          state.engineActionLog.push(item.action);
                          
                          if (result.events.length > 0) (state.events as any).push(...result.events);
                          if (result.log.length > 0) (state.engineLog as any).push(...result.log);
                          
                          state.engineNetRemoteSeq = item.seq;
                          state.engineNetExpectedSeq = item.seq + 1;

                      } catch (e) {
                          logger.error(`Sync Response: Reduce failed at seq ${item.seq}`, e);
                          state.engineNetResyncing = true;
                          break;
                      }
                  }
              }

              // Final cleanup if successful
              if (!state.engineNetResyncing) {
                  logger.info('Sync Response: Sync Complete');
                  state.engineNetPendingClientActionId = null;
                  state.engineNetPendingPredictedHash = null;
                  state.engineNetActionBuffer = {};
              }
          });
          
          // If we failed and set resyncing=true, the hook will trigger another sync request automatically if connected.
      },
    },
  }))
);

useBattleStore.subscribe((state, prevState) => {
    const { battle, selectedParticipantId } = state;
    const { setSelectedParticipantId } = state.actions;
    const { multiplayerRole } = useMultiplayerStore.getState();

    if (battle && !multiplayerRole && battle.activeParticipantId && battle.activeParticipantId !== prevState.battle?.activeParticipantId) {
        if (!selectedParticipantId || battle.participants.find(p => p.id === selectedParticipantId)?.status === 'casualty') {
             setSelectedParticipantId(battle.activeParticipantId);
        }
    }
});
