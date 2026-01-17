import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useUiStore } from './uiStore';

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
        import('../services/multiplayerService').then(({ multiplayerService }) => {
          multiplayerService.disconnect();
        });
        get().actions.reset();
        import('./battleStore').then(m => m.useBattleStore.getState().actions.resetBattle());
        useUiStore.getState().actions.setGameMode('dashboard');
      },
      reset: () => set(initialState),
    },
  }))
);
