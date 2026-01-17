import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMultiplayerStore } from '@/stores/multiplayerStore';
import { useUiStore } from '@/stores/uiStore';

// Mock dependencies
const mockSetGameMode = vi.fn();
const mockResetBattle = vi.fn();

vi.mock('@/stores/uiStore', () => ({
  useUiStore: {
    getState: vi.fn(() => ({
      actions: {
        setGameMode: mockSetGameMode,
        reset: vi.fn(),
      }
    }))
  }
}));

vi.mock('@/stores/battleStore', () => ({
  useBattleStore: {
    getState: vi.fn(() => ({
      actions: {
        resetBattle: mockResetBattle,
      }
    }))
  }
}));

vi.mock('../services/multiplayerService', () => ({
  multiplayerService: {
    disconnect: vi.fn(),
  }
}));

describe('multiplayerStore', () => {
  let multiplayerService: any;

  beforeEach(async () => {
    // Reset store state before each test
    useMultiplayerStore.getState().actions.reset();
    // Clear mocks history. This will clear hoisted mocks like mockSetGameMode too.
    vi.clearAllMocks();
    // Dynamically import the service to get the mocked instance
    multiplayerService = (await import('../services/multiplayerService')).multiplayerService;
  });

  it('should have correct initial state', () => {
    const state = useMultiplayerStore.getState();
    expect(state.multiplayerRole).toBeNull();
    expect(state.joinId).toBeNull();
  });

  it('setJoinIdAndRole should set role to guest, set joinId, and change game mode to lobby', () => {
    const testJoinId = 'test-peer-id';
    useMultiplayerStore.getState().actions.setJoinIdAndRole(testJoinId);

    const state = useMultiplayerStore.getState();
    expect(state.multiplayerRole).toBe('guest');
    expect(state.joinId).toBe(testJoinId);
    expect(mockSetGameMode).toHaveBeenCalledWith('lobby');
  });

  it('startMultiplayer should set role to host and change game mode to lobby', () => {
    useMultiplayerStore.getState().actions.startMultiplayer();

    const state = useMultiplayerStore.getState();
    expect(state.multiplayerRole).toBe('host');
    expect(mockSetGameMode).toHaveBeenCalledWith('lobby');
  });

  it('abortMultiplayer should disconnect, reset state, and change game mode to dashboard', async () => {
    // Set a non-initial state
    useMultiplayerStore.getState().actions.startMultiplayer();

    useMultiplayerStore.getState().actions.abortMultiplayer();
    
    // wait for dynamic import to resolve
    await new Promise(resolve => setTimeout(resolve, 0));

    const state = useMultiplayerStore.getState();
    expect(multiplayerService.disconnect).toHaveBeenCalled();
    expect(state.multiplayerRole).toBeNull();
    expect(state.joinId).toBeNull();
    expect(mockResetBattle).toHaveBeenCalled();
    expect(mockSetGameMode).toHaveBeenCalledWith('dashboard');
  });

  it('reset should restore the initial state', () => {
    useMultiplayerStore.getState().actions.startMultiplayer();
    expect(useMultiplayerStore.getState().multiplayerRole).toBe('host');

    // Reset
    useMultiplayerStore.getState().actions.reset();
    const state = useMultiplayerStore.getState();
    expect(state.multiplayerRole).toBeNull();
    expect(state.joinId).toBeNull();
  });
});