
import { useMemo } from 'react';
import { useCampaignProgressStore, useCrewStore, useShipStore, useBattleStore, useUiStore } from '../stores';
import { Campaign } from '../types';

export const useGameState = () => {
  const crew = useCrewStore(state => state.crew);
  const { ship, stash } = useShipStore(state => state);
  const campaignProgress = useCampaignProgressStore(state => state.campaign);
  const battle = useBattleStore(state => state.battle);
  const gameMode = useUiStore(state => state.gameMode);

  const campaign: Campaign | null = useMemo(() => {
    if (!campaignProgress) return null;
    return { ...campaignProgress, ship, stash };
  }, [campaignProgress, ship, stash]);
  
  // Computed values
  const gameStats = useMemo(() => ({
    totalCrewMembers: crew?.members.length ?? 0,
    availableCredits: campaign?.credits ?? 0,
    currentTurn: campaign?.turn ?? 1,
    activeMissions: campaign?.activeMission ? 1 : 0,
    battleInProgress: !!battle,
  }), [crew, campaign, battle]);
  
  // UI State
  const uiState = useMemo(() => ({
    isInBattle: gameMode === 'battle',
    isInCampaign: gameMode === 'dashboard',
    isCreatingCrew: gameMode === 'crew_creation',
    canStartBattle: crew && crew.members.length > 0,
    needsUpkeep: campaign?.campaignPhase === 'upkeep',
  }), [gameMode, crew, campaign]);
  
  // State Validation
  const validation = useMemo(() => ({
    hasValidCrew: crew && crew.members.length > 0,
    hasActiveCampaign: !!campaign,
    canAdvanceTurn: campaign?.tasksFinalized ?? false,
    hasEnoughCredits: (cost: number) => (campaign?.credits ?? 0) >= cost,
  }), [crew, campaign]);
  
  return {
    crew,
    campaign,
    battle,
    gameMode,
    gameStats,
    uiState,
    validation,
    isLoading: !crew && !campaign,
    hasUnsavedChanges: false, // TODO: implement
  };
};
