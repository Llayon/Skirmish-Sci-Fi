import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { useCampaignProgressStore } from '@/stores/campaignProgressStore';
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


const mockCrew: Crew = { name: 'Test Crew', members: [{ id: 'char1', task: 'idle', injuries: [] } as any] };
const mockCampaign: Campaign = { turn: 1, credits: 10, campaignPhase: 'actions', tasksFinalized: false } as any;
const mockCampaignInUpkeep: Campaign = { ...mockCampaign, campaignPhase: 'upkeep' };
const mockBattle: Battle = { id: 'test-battle', participants: [], round: 1 } as any;


describe('campaignProgressStore', () => {
  beforeEach(() => {
    // Reset the store to its initial state before each test
    useCrewStore.getState().actions.setCrew(null);
    useCampaignProgressStore.setState({ campaign: null, isHydrated: true, saveSlots: {}, actions: useCampaignProgressStore.getState().actions });
    vi.clearAllMocks();
  });

  it('should have correct initial state', () => {
    const { campaign } = useCampaignProgressStore.getState();
    const { crew } = useCrewStore.getState();
    expect(crew).toBeNull();
    expect(campaign).toBeNull();
  });

  it('startCampaign should set crew and campaign data and switch game mode', () => {
    const setGameModeMock = vi.fn();
    (useUiStore as any).getState = () => ({ actions: { setGameMode: setGameModeMock } });
    
    useCampaignProgressStore.getState().actions.startCampaign(mockCrew, mockCampaign);

    const { crew } = useCrewStore.getState();
    const { campaign } = useCampaignProgressStore.getState();
    expect(crew).toEqual(mockCrew);
    // The startCampaign action now adds a world, so we check for its presence
    expect(campaign?.currentWorld).toBeDefined();
    expect(setGameModeMock).toHaveBeenCalledWith('dashboard');
  });

  it('updateCampaign should modify the campaign state using a recipe', () => {
    useCampaignProgressStore.getState().actions.startCampaign(mockCrew, mockCampaign);
    
    useCampaignProgressStore.getState().actions.updateCampaign(c => {
      c.credits += 5;
    });

    const { campaign } = useCampaignProgressStore.getState();
    expect(campaign?.credits).toBe(15);
  });

  it('addCredits should increase campaign credits', () => {
    useCampaignProgressStore.getState().actions.startCampaign(mockCrew, mockCampaign);
    
    useCampaignProgressStore.getState().actions.addCredits(20);

    const { campaign } = useCampaignProgressStore.getState();
    expect(campaign?.credits).toBe(30);
  });

  it('spendCredits should decrease campaign credits', () => {
    useCampaignProgressStore.getState().actions.startCampaign(mockCrew, mockCampaign);
    
    useCampaignProgressStore.getState().actions.spendCredits(3);

    const { campaign } = useCampaignProgressStore.getState();
    expect(campaign?.credits).toBe(7);
  });
  
  it('resetGame should clear all stores and reset game state', () => {
    const uiSetGameModeMock = vi.fn();
    const battleResetMock = vi.fn();
    const mpResetMock = vi.fn();

    (useUiStore as any).getState = () => ({ actions: { setGameMode: uiSetGameModeMock } });
    (useBattleStore as any).getState = () => ({ actions: { resetBattle: battleResetMock } });
    (useMultiplayerStore as any).getState = () => ({ actions: { reset: mpResetMock } });

    // Set some state first
    useCampaignProgressStore.getState().actions.startCampaign(mockCrew, mockCampaign);

    // Now reset
    useCampaignProgressStore.getState().actions.resetGame(true);

    const { crew } = useCrewStore.getState();
    const { campaign } = useCampaignProgressStore.getState();
    expect(crew).toBeNull();
    expect(campaign).toBeNull();
    expect(uiSetGameModeMock).toHaveBeenCalledWith('main_menu');
    expect(battleResetMock).toHaveBeenCalled();
    expect(mpResetMock).toHaveBeenCalled();
  });
  
  it('startNewCampaignTurn should call the use case and update the campaign', () => {
    useCampaignProgressStore.getState().actions.startCampaign(mockCrew, mockCampaign);
    useCampaignProgressStore.getState().actions.startNewCampaignTurn();

    expect(campaignUseCases.startNewCampaignTurn).toHaveBeenCalled();
    const { campaign } = useCampaignProgressStore.getState();
    expect(campaign?.turn).toBe(2);
  });
  
  it('finalizeUpkeep should call the use case and switch game mode', () => {
    const setGameModeMock = vi.fn();
    (useUiStore as any).getState = () => ({ actions: { setGameMode: setGameModeMock } });
    
    useCampaignProgressStore.getState().actions.startCampaign(mockCrew, mockCampaignInUpkeep);
    useCampaignProgressStore.getState().actions.finalizeUpkeep({ debt: 0, repairs: 0 });

    expect(campaignUseCases.finalizeUpkeep).toHaveBeenCalled();
    const { campaign } = useCampaignProgressStore.getState();
    expect(campaign?.campaignPhase).toBe('actions');
    expect(setGameModeMock).toHaveBeenCalledWith('dashboard');
  });
  
  it('updateFromBattle should update campaign log and credits on success', () => {
    useCampaignProgressStore.getState().actions.startCampaign(mockCrew, mockCampaign);
    useCampaignProgressStore.getState().actions.updateFromBattle([], { type: 'Access', status: 'success' } as any, 1);
    
    const { campaign } = useCampaignProgressStore.getState();
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
      useCampaignProgressStore.getState().actions.startCampaign(mockCrew, mockCampaign);
      
      await useCampaignProgressStore.getState().actions.startMultiplayerBattle(mockCrew, mockCrew);

      expect(battleUseCases.startMultiplayerBattle).toHaveBeenCalledWith(mockCrew, mockCrew);
      expect(multiplayerService.send).toHaveBeenCalledWith({
        type: 'START_BATTLE',
        payload: mockBattle,
      });
      expect(setNewBattleMock).toHaveBeenCalledWith(mockBattle);
      expect(setGameModeMock).toHaveBeenCalledWith('battle');
    });

    it('setBattleFromLobby should set up the battle for a guest', () => {
      useCampaignProgressStore.getState().actions.startCampaign(mockCrew, mockCampaign);
      
      useCampaignProgressStore.getState().actions.setBattleFromLobby(mockBattle, 'guest');

      expect(setNewBattleMock).toHaveBeenCalledWith(mockBattle);
      expect(setGameModeMock).toHaveBeenCalledWith('battle');
    });
  });
});