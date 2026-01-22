import { create } from 'zustand';

interface HudState {
  panels: {
    queue: boolean;
    mission: boolean;
    status: boolean;
    actions: boolean;
    log: boolean;
  };
  actions: {
    setPanel: (panel: keyof HudState['panels'], value: boolean) => void;
    togglePanel: (panel: keyof HudState['panels']) => void;
  };
}

export const useHudStore = create<HudState>()((set) => ({
  panels: {
    queue: true,
    mission: true,
    status: true,
    actions: true,
    log: true,
  },
  actions: {
    setPanel: (panel, value) => set((state) => ({ panels: { ...state.panels, [panel]: value } })),
    togglePanel: (panel) => set((state) => ({ panels: { ...state.panels, [panel]: !state.panels[panel] } })),
  },
}));
