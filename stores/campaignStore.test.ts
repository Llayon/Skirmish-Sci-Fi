

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { useCampaignProgressStore as useCampaignStore } from '@/stores/campaignProgressStore';
import { useCrewStore } from '@/stores/crewStore';
import { useUiStore } from '@/stores/uiStore';
import { useBattleStore } from '@/stores/battleStore';
import { useMultiplayerStore } from '@/stores/multiplayerStore';
import { Crew, Campaign, Battle, SlotId, SaveSlot, SaveSlots, TaskType, OnBoardItemId, StatUpgrade, Mission, BattleParticipant, Character } from '@/types';
import { campaignUseCases, battleUseCases } from '@/services';

// Mock dependencies
vi.mock('@/stores/uiStore');
vi.mock('@/stores/battleStore');
vi.mock('@/stores/multiplayerStore');
vi.mock('@/services', () => ({
  campaignUseCases: {
    generateInitialWorld: vi.fn(() => ({ name: 'Test World', traits: [] })),
    acceptJob: vi.fn(campaign => ({ updatedCampaign: { ...campaign, activeMission: 'test' } })),
    startNewCampaignTurn: vi.fn(campaign => ({ updatedCampaign: { ...campaign, turn: (campaign?.turn || 0) + 1 } })),
    finalizeUpkeep: vi.fn((campaign, crew) => ({ updatedCampaign: { ...campaign, campaignPhase: 'actions' }, updatedCrew: crew })),
    updateFromBattle: vi.fn((campaign, crew) => ({ updatedCampaign: campaign, updatedCrew: crew })),
  },
  battleUseCases: {
    startMultiplayerBattle: vi.fn(),
  },
}));

vi.mock('@/services/multiplayerService', () => ({
  multiplayerService: {
    send: vi.fn(),
  }
}));

const { multiplayerService } = await import('@/services/multiplayerService');
const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};


const mockCrew: Crew = { name: 'Test Crew', members: [{ id: 'char1', task: 'idle', injuries: [] } as any] };
const mockCampaign: Campaign = { turn: 1, credits: 10, campaignPhase: 'actions', tasksFinalized: false } as any;
const mockCampaignInUpkeep: Campaign = { ...mockCampaign, campaignPhase: 'upkeep' };
const mockBattle: Battle = { id: 'test-battle', participants: [], round: 1 } as any;


describe('campaignProgressStore', () => {
  beforeEach(() => {
    // Reset the store to its initial state before each test
    useCrewStore.getState().actions.setCrew(null);
    useCampaignStore.setState({ campaign: null, isHydrated: true, saveSlots: {}, actions: useCampaignStore.getState().actions });
    vi.clearAllMocks();
  });

  it('should have correct initial state', () => {
    const { campaign } = useCampaignStore.getState();
    const { crew } = useCrewStore.getState();
    expect(crew).toBeNull();
    expect(campaign).toBeNull();
  });

  it('startCampaign should set crew and campaign data and switch game mode', () => {
    const setGameModeMock = vi.fn();
    (useUiStore as any).getState = () => ({ actions: { setGameMode: setGameModeMock } });
    
    useCampaignStore.getState().actions.startCampaign(mockCrew, mockCampaign);

    const { crew } = useCrewStore.getState();
    const { campaign } = useCampaignStore.getState();
    expect(crew).toEqual(mockCrew);
    // The startCampaign action now adds a world, so we check for its presence
    expect(campaign?.currentWorld).toBeDefined();
    expect(setGameModeMock).toHaveBeenCalledWith('dashboard');
  });

  it('updateCampaign should modify the campaign state using a recipe', () => {
    useCampaignStore.getState().actions.startCampaign(mockCrew, mockCampaign);
    
    useCampaignStore.getState().actions.updateCampaign(c => {
      c.credits += 5;
    });

    const { campaign } = useCampaignStore.getState();
    expect(campaign?.credits).toBe(15);
  });

  it('addCredits should increase campaign credits', () => {
    useCampaignStore.getState().actions.startCampaign(mockCrew, mockCampaign);
    
    useCampaignStore.getState().actions.addCredits(20);

    const { campaign } = useCampaignStore.getState();
    expect(campaign?.credits).toBe(30);
  });

  it('spendCredits should decrease campaign credits', () => {
    useCampaignStore.getState().actions.startCampaign(mockCrew, mockCampaign);
    
    useCampaignStore.getState().actions.spendCredits(3);

    const { campaign } = useCampaignStore.getState();
    expect(campaign?.credits).toBe(7);
  });
  
  it('resetGame should clear all stores and reset game state', async () => {
    const uiSetGameModeMock = vi.fn();
    const battleResetMock = vi.fn();
    const mpResetMock = vi.fn();

    (useUiStore as any).getState = () => ({ actions: { setGameMode: uiSetGameModeMock } });
    (useBattleStore as any).getState = () => ({ actions: { resetBattle: battleResetMock } });
    (useMultiplayerStore as any).getState = () => ({ actions: { reset: mpResetMock } });

    // Set some state first
    useCampaignStore.getState().actions.startCampaign(mockCrew, mockCampaign);

    // Now reset
    useCampaignStore.getState().actions.resetGame(true);
    await flushPromises();

    const { crew } = useCrewStore.getState();
    const { campaign } = useCampaignStore.getState();
    expect(crew).toBeNull();
    expect(campaign).toBeNull();
    expect(uiSetGameModeMock).toHaveBeenCalledWith('main_menu');
    expect(battleResetMock).toHaveBeenCalled();
    expect(mpResetMock).toHaveBeenCalled();
  });
  
  it('startNewCampaignTurn should update the campaign', () => {
    useCampaignStore.getState().actions.startCampaign(mockCrew, mockCampaign);
    useCampaignStore.getState().actions.startNewCampaignTurn();

    const { campaign } = useCampaignStore.getState();
    expect(campaign?.turn).toBe(2);
  });
  
  it('finalizeUpkeep should switch game mode', () => {
    const setGameModeMock = vi.fn();
    (useUiStore as any).getState = () => ({ actions: { setGameMode: setGameModeMock } });
    
    useCampaignStore.getState().actions.startCampaign(mockCrew, mockCampaignInUpkeep);
    useCampaignStore.getState().actions.finalizeUpkeep({ debt: 0, repairs: 0 });

    const { campaign } = useCampaignStore.getState();
    expect(campaign?.campaignPhase).toBe('actions');
    expect(setGameModeMock).toHaveBeenCalledWith('dashboard');
  });
  
  it('updateFromBattle should update campaign log and credits on success', () => {
    useCampaignStore.getState().actions.startCampaign(mockCrew, mockCampaign);
    useCampaignStore.getState().actions.updateFromBattle([], { type: 'Access', status: 'success' } as any, 1);
    
    const { campaign } = useCampaignStore.getState();
    expect(campaign?.log.some(l => l.key === 'log.mission.completed' && l.params?.outcome === 'success')).toBe(true);
    expect(campaign?.credits).toBe(11);
  });

  describe('multiplayer actions', () => {
    let setGameModeMock: Mock;
    let setNewBattleMock: Mock;

    beforeEach(() => {
        setGameModeMock = vi.fn();
        setNewBattleMock = vi.fn();
        (useUiStore as any).getState = () => ({ actions: { setGameMode: setGameModeMock } });
        (useBattleStore as any).getState = () => ({ actions: { setNewBattle: setNewBattleMock } });
        
        // Mock battle use case for starting a multiplayer battle
        vi.mocked(battleUseCases.startMultiplayerBattle).mockResolvedValue(mockBattle);
    });

    it('startMultiplayerBattle should create a battle and send it to the peer', async () => {
      useCampaignStore.getState().actions.startCampaign(mockCrew, mockCampaign);
      
      await useCampaignStore.getState().actions.startMultiplayerBattle(mockCrew, mockCrew);
      await flushPromises();

      expect(battleUseCases.startMultiplayerBattle).toHaveBeenCalledWith(mockCrew, mockCrew);
      expect(multiplayerService.send).toHaveBeenCalledWith({
        type: 'START_BATTLE',
        payload: mockBattle,
      });
      expect(setNewBattleMock).toHaveBeenCalledWith(mockBattle);
      expect(setGameModeMock).toHaveBeenCalledWith('battle');
    });

    it('setBattleFromLobby should set up the battle for a guest', async () => {
      useCampaignStore.getState().actions.startCampaign(mockCrew, mockCampaign);
      
      useCampaignStore.getState().actions.setBattleFromLobby(mockBattle, 'guest');
      await flushPromises();

      expect(setNewBattleMock).toHaveBeenCalledWith(mockBattle);
      expect(setGameModeMock).toHaveBeenCalledWith('battle');
    });
  });
});
