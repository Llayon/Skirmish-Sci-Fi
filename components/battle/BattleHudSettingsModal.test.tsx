import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BattleHudSettingsModal from './BattleHudSettingsModal';

vi.mock('@/components/ui/Modal', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/stores', () => ({ useHudStore: vi.fn(), useBattleStore: vi.fn() }));
vi.mock('@/stores/settingsStore', () => ({ useSettingsStore: vi.fn() }));

const { useHudStore, useBattleStore } = await import('@/stores');
const { useSettingsStore } = await import('@/stores/settingsStore');

describe('BattleHudSettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useHudStore).mockImplementation((selector: any) =>
      selector({
        preset: 'full',
        panels: { queue: true, mission: true, status: true, actions: true, log: true },
        density: 'normal',
        autoHideSecondaryPanels: true,
        actions: {
          applyPreset: vi.fn(),
          togglePanel: vi.fn(),
          setDensity: vi.fn(),
          setAutoHideSecondaryPanels: vi.fn(),
          reset: vi.fn(),
        },
      })
    );

    vi.mocked(useBattleStore).mockImplementation((selector: any) =>
      selector({
        battle: {
          participants: [{ id: 'char1', type: 'character', name: 'Rook', position: { x: 0, y: 0 }, status: 'active' }],
          activeParticipantId: 'char1',
        },
        selectedParticipantId: null,
        followActive3D: false,
        actions: {
          requestCameraFocusOn: vi.fn(),
          requestCameraReset: vi.fn(),
          setFollowActive3D: vi.fn(),
        },
      })
    );

    vi.mocked(useSettingsStore).mockImplementation((selector: any) =>
      selector({
        reducedMotion: false,
        reducedVfx: false,
        threeQuality: 'high',
        camera3dPreset: 'tactical',
        camera3dInvertWheel: false,
        camera3dZoomSpeed: 1,
        camera3dPanSpeed: 1,
        camera3dRotateSpeed: 1,
        actions: {
          toggleReducedMotion: vi.fn(),
          toggleReducedVfx: vi.fn(),
          setThreeQuality: vi.fn(),
          setCamera3dPreset: vi.fn(),
          setCamera3dInvertWheel: vi.fn(),
          setCamera3dZoomSpeed: vi.fn(),
          setCamera3dPanSpeed: vi.fn(),
          setCamera3dRotateSpeed: vi.fn(),
          resetCamera3D: vi.fn(),
        },
      })
    );
  });

  it('renders 3D camera section only in 3D', () => {
    const { rerender } = render(<BattleHudSettingsModal onClose={vi.fn()} onOpenHelp={vi.fn()} is3D />);
    expect(screen.getByText('battle.hud.camera.title')).toBeInTheDocument();

    rerender(<BattleHudSettingsModal onClose={vi.fn()} onOpenHelp={vi.fn()} is3D={false} />);
    expect(screen.queryByText('battle.hud.camera.title')).toBeNull();
  });

  it('toggles followActive3D', () => {
    const setFollowActive3D = vi.fn();
    vi.mocked(useBattleStore).mockImplementation((selector: any) =>
      selector({
        battle: {
          participants: [{ id: 'char1', type: 'character', name: 'Rook', position: { x: 0, y: 0 }, status: 'active' }],
          activeParticipantId: 'char1',
        },
        selectedParticipantId: null,
        followActive3D: false,
        actions: {
          requestCameraFocusOn: vi.fn(),
          requestCameraReset: vi.fn(),
          setFollowActive3D,
        },
      })
    );

    render(<BattleHudSettingsModal onClose={vi.fn()} onOpenHelp={vi.fn()} is3D />);
    fireEvent.click(screen.getByText('battle.hud.camera.followActive'));
    expect(setFollowActive3D).toHaveBeenCalledWith(true);
  });

  it('renders help button', () => {
    render(<BattleHudSettingsModal onClose={vi.fn()} onOpenHelp={vi.fn()} is3D />);
    expect(screen.getByText('battle.help.open')).toBeInTheDocument();
  });
});
