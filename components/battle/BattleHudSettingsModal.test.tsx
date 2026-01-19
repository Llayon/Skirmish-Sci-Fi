import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BattleHudSettingsModal from './BattleHudSettingsModal';

vi.mock('@/components/ui/Modal', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/stores', () => ({ useHudStore: vi.fn(), useBattleStore: vi.fn() }));

const { useHudStore, useBattleStore } = await import('@/stores');

describe('BattleHudSettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useHudStore).mockImplementation((selector: any) =>
      selector({
        preset: 'full',
        panels: { queue: true, mission: true, status: true, actions: true, log: true },
        density: 'normal',
        actions: {
          applyPreset: vi.fn(),
          togglePanel: vi.fn(),
          setDensity: vi.fn(),
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
  });

  it('renders 3D camera section only in 3D', () => {
    const { rerender } = render(<BattleHudSettingsModal onClose={vi.fn()} is3D />);
    expect(screen.getByText('battle.hud.camera.title')).toBeInTheDocument();

    rerender(<BattleHudSettingsModal onClose={vi.fn()} is3D={false} />);
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

    render(<BattleHudSettingsModal onClose={vi.fn()} is3D />);
    fireEvent.click(screen.getByText('battle.hud.camera.followActive'));
    expect(setFollowActive3D).toHaveBeenCalledWith(true);
  });
});
