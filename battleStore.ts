import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Battle, PlayerAction, AnimationState, MissionType, Crew, BattleParticipant, Campaign } from '../types';
import { useCampaignProgressStore } from './campaignProgressStore';
import { useCrewStore } from './crewStore';
import { useUiStore } from './uiStore';
import { useMultiplayerStore, MultiplayerRole } from './multiplayerStore';
import { battleUseCases } from '../services';
import { handleError } from '../services/utils/errorHandler';
import { logger } from '../services/utils/logger';
import { useShipStore } from './shipStore';
import { EnemyEncounterCategory } from '@/constants/enemyEncounters';

interface BattleState {
  battle: Battle | null;
  selectedParticipantId: string | null;
  hoveredParticipantId: string | null;
  isProcessingEnemies: boolean;
  showEnemyTurnBanner: boolean;
  animation: AnimationState;
  animatingParticipantId: string | null;
  pendingActionFor: string | null;
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
    sendFullBattleSync: () => void;
    resetBattle: () => void;
    processEnemyTurn: (enemyId: string) => Promise<{ animation: AnimationState; duration: number }>;
    resolveNotableSight: () => void;
  };
}

const initialBattleState: Omit<BattleState, 'actions'> = {
  battle: null,
  selectedParticipantId: null,
  hoveredParticipantId: null,
  isProcessingEnemies: false,
  showEnemyTurnBanner: false,
  animation: null,
  animatingParticipantId: null,
  pendingActionFor: null,
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
                  import('../services/multiplayerService').then(({ multiplayerService }) => {
                    multiplayerService.send({ type: 'BATTLE_UPDATE', payload: latestBattle });
                  });
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
      },
      endBattle: () => {
        const { multiplayerRole } = useMultiplayerStore.getState();
        const battle = get().battle;

        if (!battle) return;

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
          state.selectedParticipantId = null;
        });
        useUiStore.getState().actions.setGameMode('dashboard');
      },
      endTurn: (characterId) => {
        const battle = get().battle;
        const id = characterId || battle?.activeParticipantId;
        if (id) {
          get().actions.dispatchAction({ type: 'end_turn', payload: { characterId: id } });
        }
      },
      dispatchAction: (action) => {
        const { multiplayerRole } = useMultiplayerStore.getState();
        if (multiplayerRole === 'guest') {
          const characterId = (action.payload as any).characterId;
          if (characterId) {
            set((state) => {
              state.pendingActionFor = characterId;
            });
          }
          import('../services/multiplayerService').then(({ multiplayerService }) => {
            multiplayerService.send({ type: 'PLAYER_ACTION', payload: action });
          });
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
      sendFullBattleSync: () => {
        const { battle } = get();
        const { multiplayerRole } = useMultiplayerStore.getState();
        if (battle && multiplayerRole === 'host') {
          logger.info('Host received sync request. Sending full battle state.');
          import('../services/multiplayerService').then(({ multiplayerService }) => {
            multiplayerService.send({ type: 'BATTLE_UPDATE', payload: battle });
          });
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