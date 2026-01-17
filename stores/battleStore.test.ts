import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useBattleStore } from '@/stores/battleStore';
import { useUiStore } from '@/stores/uiStore';
import { useMultiplayerStore } from '@/stores/multiplayerStore';
import { Battle, MultiplayerMessage, PlayerAction, MultiplayerRole } from '../types';
import { battleUseCases } from '../services';

// Mock dependencies
vi.mock('@/stores/uiStore');
vi.mock('@/stores/multiplayerStore', () => ({
  useMultiplayerStore: {
    getState: vi.fn(() => ({
      multiplayerRole: null,
      actions: {},
    })),
  },
}));
vi.mock('../services', () => ({
  battleUseCases: {
    processPlayerAction: vi.fn().mockReturnValue({ logs: [] }),
    advancePhase: vi.fn(),
    processEnemyTurn: vi.fn().mockReturnValue({ updatedBattle: { id: 'updated-battle' }, animation: null, duration: 0 }),
  },
  campaignUseCases: {},
}));

vi.mock('../services/multiplayerService', () => ({
  multiplayerService: {
    send: vi.fn(),
  }
}));

const { multiplayerService } = await import('../services/multiplayerService');

const mockBattle: Battle = { id: 'test-battle', participants: [], round: 1 } as any;


describe('battleStore', () => {
  beforeEach(() => {
    useBattleStore.getState().actions.resetBattle();
    vi.clearAllMocks();
  });

  it('should have correct initial state', () => {
    const state = useBattleStore.getState();
    expect(state.battle).toBeNull();
    expect(state.selectedParticipantId).toBeNull();
    expect(state.isProcessingEnemies).toBe(false);
  });

  it('setNewBattle should set the battle state', () => {
    useBattleStore.getState().actions.setNewBattle(mockBattle);
    expect(useBattleStore.getState().battle).toEqual(mockBattle);
  });

  it('setSelectedParticipantId should update the selected participant ID', () => {
    useBattleStore.getState().actions.setSelectedParticipantId('player1');
    expect(useBattleStore.getState().selectedParticipantId).toBe('player1');
  });

  it('endBattle should change the game mode to post_battle for solo games', () => {
    const setGameModeMock = vi.fn();
    (useUiStore as any).getState = () => ({ actions: { setGameMode: setGameModeMock } });
    
    // Need a battle to exist first
    useBattleStore.getState().actions.setNewBattle(mockBattle);

    useBattleStore.getState().actions.endBattle();
    expect(setGameModeMock).toHaveBeenCalledWith('post_battle');
  });

  it('dispatchAction should call battleUseCases.processPlayerAction', () => {
    useBattleStore.getState().actions.setNewBattle(mockBattle);
    const mockAction = { type: 'move', payload: {} } as any;
    
    useBattleStore.getState().actions.dispatchAction(mockAction);

    expect(battleUseCases.processPlayerAction).toHaveBeenCalled();
  });

  it('resetBattle should restore the initial state', () => {
    useBattleStore.getState().actions.setNewBattle(mockBattle);
    useBattleStore.getState().actions.setSelectedParticipantId('player1');
    
    useBattleStore.getState().actions.resetBattle();
    
    const state = useBattleStore.getState();
    expect(state.battle).toBeNull();
    expect(state.selectedParticipantId).toBeNull();
  });

  it('advancePhase should call battleUseCases.advancePhase', () => {
    useBattleStore.getState().actions.setNewBattle(mockBattle);
    useBattleStore.getState().actions.advancePhase();
    expect(battleUseCases.advancePhase).toHaveBeenCalled();
  });

  it('processEnemyTurn should call battleUseCases.processEnemyTurn and update the battle state', async () => {
    useBattleStore.getState().actions.setNewBattle(mockBattle);
    
    await useBattleStore.getState().actions.processEnemyTurn('enemy1');

    expect(battleUseCases.processEnemyTurn).toHaveBeenCalledWith(
      expect.anything(), // battle state
      'enemy1',
      null // multiplayerRole
    );
    
    // Check if the battle state was updated with the mock return value
    expect(useBattleStore.getState().battle?.id).toBe('updated-battle');
  });

  describe('multiplayer guest behavior', () => {
    beforeEach(() => {
      // Set the multiplayer role for these tests
      vi.mocked(useMultiplayerStore.getState).mockReturnValue({ 
        multiplayerRole: 'guest',
        actions: {}
      } as any);
    });

    it('dispatchAction should set pendingActionFor and send a message via multiplayerService', () => {
      useBattleStore.getState().actions.setNewBattle(mockBattle);
      const mockAction = { type: 'move', payload: { characterId: 'player1' } } as any;

      useBattleStore.getState().actions.dispatchAction(mockAction);

      expect(useBattleStore.getState().pendingActionFor).toBe('player1');
      expect(multiplayerService.send).toHaveBeenCalledWith({ type: 'PLAYER_ACTION', payload: mockAction });
      // It should NOT process the action locally
      expect(battleUseCases.processPlayerAction).not.toHaveBeenCalled();
    });

    it('setBattle should clear pendingActionFor when receiving an update', () => {
      useBattleStore.getState().actions.setNewBattle(mockBattle);
      // Manually set pending state
      useBattleStore.setState({ pendingActionFor: 'player1' });
      expect(useBattleStore.getState().pendingActionFor).toBe('player1');

      // Simulate receiving a BATTLE_UPDATE
      useBattleStore.getState().actions.setBattle(b => {
        b.round = 2;
      });

      expect(useBattleStore.getState().pendingActionFor).toBeNull();
    });
  });

  describe('multiplayer host behavior', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.mocked(useMultiplayerStore.getState).mockReturnValue({ 
          multiplayerRole: 'host',
          actions: {}
        } as any);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('dispatchAction should process the action directly', () => {
      useBattleStore.getState().actions.setNewBattle(mockBattle);
      const mockAction = { type: 'move', payload: {} } as any;

      useBattleStore.getState().actions.dispatchAction(mockAction);
      
      expect(battleUseCases.processPlayerAction).toHaveBeenCalled();
      // Send is debounced, so it shouldn't be called immediately
      expect(multiplayerService.send).not.toHaveBeenCalled();
    });

    it('setBattle should debounce sending BATTLE_UPDATE messages', () => {
      useBattleStore.getState().actions.setNewBattle(mockBattle);
      
      // Call setBattle multiple times
      useBattleStore.getState().actions.setBattle(b => { b.round = 2; });
      useBattleStore.getState().actions.setBattle(b => { b.round = 3; });
      useBattleStore.getState().actions.setBattle(b => { b.round = 4; });
      
      expect(multiplayerService.send).not.toHaveBeenCalled();

      // Fast-forward time
      vi.advanceTimersByTime(150); // debounce is 100ms, so 150ms should be enough

      expect(multiplayerService.send).toHaveBeenCalledTimes(1);
      expect(multiplayerService.send).toHaveBeenCalledWith({
        type: 'BATTLE_UPDATE',
        payload: expect.objectContaining({ round: 4 }), // Should send the latest state
      });
    });
  });
});