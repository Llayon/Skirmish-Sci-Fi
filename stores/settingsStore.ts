import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface SettingsState {
  reducedMotion: boolean;
  reducedVfx: boolean;
  threeQuality: 'low' | 'medium' | 'high';
  camera3dPreset: 'tactical' | 'cinematic';
  camera3dInvertWheel: boolean;
  camera3dZoomSpeed: number;
  camera3dPanSpeed: number;
  camera3dRotateSpeed: number;
  actions: {
    setReducedMotion: (value: boolean) => void;
    toggleReducedMotion: () => void;
    setReducedVfx: (value: boolean) => void;
    toggleReducedVfx: () => void;
    setThreeQuality: (value: 'low' | 'medium' | 'high') => void;
    setCamera3dPreset: (value: 'tactical' | 'cinematic') => void;
    setCamera3dInvertWheel: (value: boolean) => void;
    setCamera3dZoomSpeed: (value: number) => void;
    setCamera3dPanSpeed: (value: number) => void;
    setCamera3dRotateSpeed: (value: number) => void;
    resetCamera3D: () => void;
    reset: () => void;
  };
}

const initialState: Omit<SettingsState, 'actions'> = {
  reducedMotion: false,
  reducedVfx: false,
  threeQuality: 'high',
  camera3dPreset: 'tactical',
  camera3dInvertWheel: false,
  camera3dZoomSpeed: 1,
  camera3dPanSpeed: 1,
  camera3dRotateSpeed: 1,
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
        setThreeQuality: (value) => set((state) => { state.threeQuality = value; }),
        setCamera3dPreset: (value) => set((state) => { state.camera3dPreset = value; }),
        setCamera3dInvertWheel: (value) => set((state) => { state.camera3dInvertWheel = value; }),
        setCamera3dZoomSpeed: (value) => set((state) => { state.camera3dZoomSpeed = value; }),
        setCamera3dPanSpeed: (value) => set((state) => { state.camera3dPanSpeed = value; }),
        setCamera3dRotateSpeed: (value) => set((state) => { state.camera3dRotateSpeed = value; }),
        resetCamera3D: () =>
          set((state) => {
            state.camera3dPreset = initialState.camera3dPreset;
            state.camera3dInvertWheel = initialState.camera3dInvertWheel;
            state.camera3dZoomSpeed = initialState.camera3dZoomSpeed;
            state.camera3dPanSpeed = initialState.camera3dPanSpeed;
            state.camera3dRotateSpeed = initialState.camera3dRotateSpeed;
          }),
        reset: () => set(initialState),
      },
    })),
    {
      name: 'settings',
    }
  )
);
