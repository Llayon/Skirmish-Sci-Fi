
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type GameMode = 'main_menu' | 'crew_creation' | 'dashboard' | 'lobby' | 'battle' | 'post_battle' | 'pre_battle_briefing';

interface UiState {
  gameMode: GameMode;
  actions: {
    setGameMode: (mode: GameMode) => void;
    reset: () => void;
  };
}

const initialState: Omit<UiState, 'actions'> = {
  gameMode: 'main_menu',
};

export const useUiStore = create<UiState>()(
  immer((set) => ({
    ...initialState,
    actions: {
      setGameMode: (mode) => set((state) => { state.gameMode = mode; }),
      reset: () => set(initialState),
    },
  }))
);
