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
});
