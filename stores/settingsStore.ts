import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface SettingsState {
  reducedMotion: boolean;
  reducedVfx: boolean;
  actions: {
    setReducedMotion: (value: boolean) => void;
    toggleReducedMotion: () => void;
    setReducedVfx: (value: boolean) => void;
    toggleReducedVfx: () => void;
    reset: () => void;
  };
}

const initialState: Omit<SettingsState, 'actions'> = {
  reducedMotion: false,
  reducedVfx: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    immer((set) => ({
      ...initialState,
      actions: {
        setReducedMotion: (value) => set((state) => { state.reducedMotion = value; }),
        toggleReducedMotion: () => set((state) => { state.reducedMotion = !state.reducedMotion; }),
        setReducedVfx: (value) => set((state) => { state.reducedVfx = value; }),
        toggleReducedVfx: () => set((state) => { state.reducedVfx = !state.reducedVfx; }),
        reset: () => set(initialState),
      },
    })),
    {
      name: 'settings',
    }
  )
);

