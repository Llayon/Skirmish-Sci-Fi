import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EngineV2HudControls } from './EngineV2HudControls';
import { useBattleStore } from '@/stores/battleStore';
import { useMultiplayerStore } from '@/stores/multiplayerStore';
import type { Battle } from '@/types/battle';
import type { RngState } from '@/services/engine/rng/rng';
import type { BattleAction } from '@/services/engine/battle/types';

import { isEngineV2MpDebugEnabled } from '@/src/config/engineV2Debug';

// Mock Translation
vi.mock('../../i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock Config
vi.mock('@/src/config/engineV2Debug', () => ({
  isEngineV2MpDebugEnabled: vi.fn(),
}));

// Helper to reset stores
const resetStores = () => {
  const actions = useBattleStore.getState().actions;

  useBattleStore.setState({
    engineV2Enabled: false,
    battle: null,
    rng: null,
    actions: {
      ...actions,
      dispatchEngineAction: vi.fn<(action: BattleAction) => void>(),
    }
  });
  useMultiplayerStore.setState({
    multiplayerRole: null
  });
};

describe('EngineV2HudControls', () => {
  beforeEach(() => {
    resetStores();
  });

  it('does not render when engineV2Enabled is false', () => {
    useBattleStore.setState({ engineV2Enabled: false });
    const { container } = render(<EngineV2HudControls />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when multiplayerRole is set (in PROD mode)', () => {
    // Mock debug flag to false (simulate PROD)
    (isEngineV2MpDebugEnabled as any).mockReturnValue(false);

    useBattleStore.setState({ engineV2Enabled: true });
    useMultiplayerStore.setState({ multiplayerRole: 'host' });
    const { container } = render(<EngineV2HudControls />);
    
    expect(container.firstChild).toBeNull();
  });

  it('renders when multiplayerRole is set if debug flag is active', () => {
    // Mock debug flag to true
    (isEngineV2MpDebugEnabled as any).mockReturnValue(true);
    
    useBattleStore.setState({ 
        engineV2Enabled: true,
        battle: { phase: 'reaction_roll' } as unknown as Battle,
        rng: { cursor: 0, seed: 1 } as RngState
    });
    useMultiplayerStore.setState({ multiplayerRole: 'host' });
    
    render(<EngineV2HudControls />);
    
    expect(screen.getByTestId('enginev2-roll-initiative')).toBeInTheDocument();
  });

  it('renders buttons disabled when battle/rng are missing', () => {
    useBattleStore.setState({ 
      engineV2Enabled: true,
      battle: null, // Missing
      rng: { cursor: 0, seed: 1 } as RngState 
    });
    
    render(<EngineV2HudControls />);
    
    const rollBtn = screen.getByTestId('enginev2-roll-initiative');
    const advanceBtn = screen.getByTestId('enginev2-advance-phase');
    
    expect(rollBtn).toBeDisabled();
    expect(advanceBtn).toBeDisabled();
  });

  it('enables Roll Initiative only in reaction_roll phase', () => {
    useBattleStore.setState({ 
      engineV2Enabled: true,
      battle: { phase: 'reaction_roll' } as unknown as Battle,
      rng: { cursor: 0, seed: 1 } as RngState
    });

    render(<EngineV2HudControls />);
    
    const rollBtn = screen.getByTestId('enginev2-roll-initiative');
    const advanceBtn = screen.getByTestId('enginev2-advance-phase');

    expect(rollBtn).not.toBeDisabled();
    expect(advanceBtn).toBeDisabled();
  });

  it('enables Advance Phase in action phases', () => {
    useBattleStore.setState({
      engineV2Enabled: true,
      battle: { phase: 'quick_actions' } as unknown as Battle,
      rng: { cursor: 0, seed: 1 } as RngState
    });

    render(<EngineV2HudControls />);

    const rollBtn = screen.getByTestId('enginev2-roll-initiative');
    const advanceBtn = screen.getByTestId('enginev2-advance-phase');

    expect(rollBtn).toBeDisabled();
    expect(advanceBtn).not.toBeDisabled();
  });

  describe('Jump Down button', () => {
    const buildBattle = (overrides: Partial<Battle> = {}): Battle => ({
      participants: [],
      terrain: [],
      gridSize: { width: 10, height: 10 },
      phase: 'quick_actions',
      ...(overrides as object),
    } as Battle);

    it('is disabled when no participant is selected', () => {
      useBattleStore.setState({
        engineV2Enabled: true,
        battle: buildBattle(),
        rng: { cursor: 0, seed: 1 } as RngState,
        selectedParticipantId: null,
      });
      render(<EngineV2HudControls />);
      expect(screen.getByTestId('enginev2-jump-down')).toBeDisabled();
    });

    it('is disabled when the selected participant has no valid drop', () => {
      const ground = { id: 'p1', position: { x: 5, y: 5 }, status: 'active' };
      useBattleStore.setState({
        engineV2Enabled: true,
        battle: buildBattle({ participants: [ground] as unknown as Battle['participants'] }),
        rng: { cursor: 0, seed: 1 } as RngState,
        selectedParticipantId: 'p1',
      });
      render(<EngineV2HudControls />);
      expect(screen.getByTestId('enginev2-jump-down')).toBeDisabled();
    });

    it('is enabled and dispatches JUMP_DOWN when a drop target exists', async () => {
      const dispatchSpy = vi.fn();
      const elevated = { id: 'p1', position: { x: 5, y: 5 }, status: 'active' };
      useBattleStore.setState({
        engineV2Enabled: true,
        battle: buildBattle({
          participants: [elevated] as unknown as Battle['participants'],
          terrain: [{
            id: 'roof', name: 'Roof', type: 'Area',
            position: { x: 5, y: 5 }, size: { width: 1, height: 1 },
            isDifficult: false, providesCover: false, blocksLineOfSight: false,
            isImpassable: false, baseElevation: 2, objectHeight: 0,
          }] as Battle['terrain'],
        }),
        rng: { cursor: 0, seed: 1 } as RngState,
        selectedParticipantId: 'p1',
        actions: { ...useBattleStore.getState().actions, dispatchEngineAction: dispatchSpy },
      });
      render(<EngineV2HudControls />);
      const btn = screen.getByTestId('enginev2-jump-down');
      expect(btn).not.toBeDisabled();
      btn.click();
      await waitFor(() => expect(dispatchSpy).toHaveBeenCalled());
      const dispatched = dispatchSpy.mock.calls[0][0];
      expect(dispatched.type).toBe('JUMP_DOWN');
      expect(dispatched.participantId).toBe('p1');
      expect(dispatched.to).toBeDefined();
    });
  });
});
