import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useUiStore } from './uiStore';
import { multiplayerService } from '@/services/multiplayerService';
import { useBattleStore } from '@/stores/battleStore';

export type MultiplayerRole = 'host' | 'guest';

interface MultiplayerState {
  multiplayerRole: MultiplayerRole | null;
  joinId: string | null;
  actions: {
    setJoinIdAndRole: (joinId: string) => void;
    startMultiplayer: () => void;
    abortMultiplayer: () => void;
    reset: () => void;
  };
}

const initialState: Omit<MultiplayerState, 'actions'> = {
  multiplayerRole: null,
  joinId: null,
};

export const useMultiplayerStore = create<MultiplayerState>()(
  immer((set, get) => ({
    ...initialState,
    actions: {
      setJoinIdAndRole: (joinId) => {
        set((state) => {
          state.joinId = joinId;
          state.multiplayerRole = 'guest';
        });
        useUiStore.getState().actions.setGameMode('lobby');
      },
      startMultiplayer: () => {
        set((state) => {
          state.multiplayerRole = 'host';
        });
        useUiStore.getState().actions.setGameMode('lobby');
      },
      abortMultiplayer: () => {
        multiplayerService.disconnect();
        get().actions.reset();
        useBattleStore.getState().actions.resetBattle();
        useUiStore.getState().actions.setGameMode('dashboard');
      },
      reset: () => set(initialState),
    },
  }))
);
