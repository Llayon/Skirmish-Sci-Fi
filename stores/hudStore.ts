import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type HudPreset = 'full' | 'tactical' | 'spectator' | 'minimal' | 'custom';

export type HudPanelsState = {
  queue: boolean;
  mission: boolean;
  status: boolean;
  actions: boolean;
  log: boolean;
};

export type HudDensity = 'compact' | 'normal';

export type HudCollapsedState = {
  queue: boolean;
  mission: boolean;
  status: boolean;
  actions: boolean;
  log: boolean;
};

interface HudState {
  preset: HudPreset;
  panels: HudPanelsState;
  collapsed: HudCollapsedState;
  density: HudDensity;
  autoHideSecondaryPanels: boolean;
  actions: {
    applyPreset: (preset: Exclude<HudPreset, 'custom'>) => void;
    setPanelVisible: (panel: keyof HudPanelsState, visible: boolean) => void;
    togglePanel: (panel: keyof HudPanelsState) => void;
    toggleCollapsed: (panel: keyof HudCollapsedState) => void;
    setDensity: (density: HudDensity) => void;
    setAutoHideSecondaryPanels: (enabled: boolean) => void;
    reset: () => void;
  };
}

const presetPanels: Record<Exclude<HudPreset, 'custom'>, HudPanelsState> = {
  full: { queue: true, mission: true, status: true, actions: true, log: true },
  tactical: { queue: false, mission: true, status: true, actions: true, log: false },
  spectator: { queue: true, mission: true, status: true, actions: false, log: true },
  minimal: { queue: false, mission: true, status: false, actions: true, log: false },
};

const presetCollapsed: Record<Exclude<HudPreset, 'custom'>, HudCollapsedState> = {
  full: { queue: false, mission: false, status: false, actions: false, log: false },
  tactical: { queue: true, mission: false, status: false, actions: false, log: true },
  spectator: { queue: false, mission: true, status: false, actions: true, log: false },
  minimal: { queue: true, mission: true, status: true, actions: false, log: true },
};

const presetDensity: Record<Exclude<HudPreset, 'custom'>, HudDensity> = {
  full: 'normal',
  tactical: 'compact',
  spectator: 'normal',
  minimal: 'compact',
};

const initialState: Omit<HudState, 'actions'> = {
  preset: 'full',
  panels: { ...presetPanels.full },
  collapsed: { ...presetCollapsed.full },
  density: presetDensity.full,
  autoHideSecondaryPanels: true,
};

export const useHudStore = create<HudState>()(
  persist(
    immer((set) => ({
      ...initialState,
      actions: {
        applyPreset: (preset) =>
          set((state) => {
            state.preset = preset;
            state.panels = { ...presetPanels[preset] };
            state.collapsed = { ...presetCollapsed[preset] };
            state.density = presetDensity[preset];
          }),
        setPanelVisible: (panel, visible) =>
          set((state) => {
            state.panels[panel] = visible;
            state.preset = 'custom';
          }),
        togglePanel: (panel) =>
          set((state) => {
            state.panels[panel] = !state.panels[panel];
            state.preset = 'custom';
          }),
        toggleCollapsed: (panel) =>
          set((state) => {
            state.collapsed[panel] = !state.collapsed[panel];
            state.preset = 'custom';
          }),
        setDensity: (density) =>
          set((state) => {
            state.density = density;
            state.preset = 'custom';
          }),
        setAutoHideSecondaryPanels: (enabled) =>
          set((state) => {
            state.autoHideSecondaryPanels = enabled;
            state.preset = 'custom';
          }),
        reset: () =>
          set({
            ...initialState,
            panels: { ...presetPanels.full },
            collapsed: { ...presetCollapsed.full },
            density: presetDensity.full,
          }),
      },
    })),
    {
      name: 'hud',
      version: 3,
      partialize: (state) => ({
        preset: state.preset,
        panels: state.panels,
        collapsed: state.collapsed,
        density: state.density,
        autoHideSecondaryPanels: state.autoHideSecondaryPanels,
      }),
      migrate: (persistedState) => {
        const state =
          persistedState as Partial<Pick<HudState, 'preset' | 'panels' | 'collapsed' | 'density' | 'autoHideSecondaryPanels'>> | undefined;
        const preset = state?.preset;
        const panels = state?.panels;
        const collapsed = state?.collapsed;
        const density = state?.density;
        const autoHideSecondaryPanels = state?.autoHideSecondaryPanels ?? initialState.autoHideSecondaryPanels;

        const normalizedPanels: HudPanelsState = {
          queue: panels?.queue ?? presetPanels.full.queue,
          mission: panels?.mission ?? presetPanels.full.mission,
          status: panels?.status ?? presetPanels.full.status,
          actions: panels?.actions ?? presetPanels.full.actions,
          log: panels?.log ?? presetPanels.full.log,
        };

        const normalizedCollapsed: HudCollapsedState = {
          queue: collapsed?.queue ?? presetCollapsed.full.queue,
          mission: collapsed?.mission ?? presetCollapsed.full.mission,
          status: collapsed?.status ?? presetCollapsed.full.status,
          actions: collapsed?.actions ?? presetCollapsed.full.actions,
          log: collapsed?.log ?? presetCollapsed.full.log,
        };

        const normalizedDensity: HudDensity =
          density === 'compact' || density === 'normal' ? density : presetDensity.full;

        if (preset === 'full' || preset === 'tactical' || preset === 'spectator' || preset === 'minimal') {
          return {
            preset,
            panels: normalizedPanels,
            collapsed: normalizedCollapsed,
            density: normalizedDensity,
            autoHideSecondaryPanels,
          } as any;
        }

        return {
          preset: 'full',
          panels: normalizedPanels,
          collapsed: normalizedCollapsed,
          density: normalizedDensity,
          autoHideSecondaryPanels,
        } as any;
      },
    }
  )
);
