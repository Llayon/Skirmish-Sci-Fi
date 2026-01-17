import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BattleView from './BattleView';
import { GameMode } from '@/stores';

vi.mock('./BattleGrid', () => ({ default: () => <div data-testid="battle-grid" /> }));
vi.mock('./AnimationLayer', () => ({ default: () => <div data-testid="animation-layer" /> }));
vi.mock('./BattleHUD', () => ({ default: () => <div data-testid="battle-hud" /> }));
vi.mock('../../i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../stores', () => ({ useMultiplayerStore: vi.fn(), useBattleStore: vi.fn() }));
vi.mock('../../hooks/useGameState');
vi.mock('../../hooks/useMultiplayer');
vi.mock('../../hooks/useBattleLogic', () => ({ useBattleLogic: vi.fn(() => ({})) }));

const { useBattleStore } = await import('../../stores');
const { useGameState } = await import('../../hooks/useGameState');
const { useMultiplayer } = await import('../../hooks/useMultiplayer');

const mockGameState = (battleOverride: any) => ({
    battle: battleOverride ? { participants: [], ...battleOverride } : null,
    crew: null,
    campaign: null,
    gameMode: 'battle' as const,
    gameStats: { totalCrewMembers: 0, availableCredits: 0, currentTurn: 1, activeMissions: 0, battleInProgress: true },
    uiState: { isInBattle: true, isInCampaign: false, isCreatingCrew: false, canStartBattle: false, needsUpkeep: false },
    validation: { hasValidCrew: false, hasActiveCampaign: false, canAdvanceTurn: false, hasEnoughCredits: () => false },
    isLoading: false,
    hasUnsavedChanges: false,
});


describe('BattleView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMultiplayer).mockReturnValue({ isReconnecting: false, connectionStatus: 'connected', isHost: false, isGuest: false, multiplayerRole: null });
    vi.mocked(useGameState).mockReturnValue(mockGameState({ id: 'test-battle', phase: 'quick_actions' }));
    vi.mocked(useBattleStore).mockReturnValue({ showEnemyTurnBanner: false, actions: { endBattle: vi.fn(), endTurn: vi.fn() } });
  });

  it('renders loading text if battle is not available', () => {
    vi.mocked(useGameState).mockReturnValue(mockGameState(null));
    render(<BattleView />);
    expect(screen.getByText('Loading battle...')).toBeInTheDocument();
  });

  it('renders core components when a battle is active', () => {
    render(<BattleView />);
    expect(screen.getByTestId('battle-grid')).toBeInTheDocument();
    expect(screen.getByTestId('animation-layer')).toBeInTheDocument();
    expect(screen.getByTestId('battle-hud')).toBeInTheDocument();
  });

  it('displays the battle end screen when phase is battle_over', () => {
    vi.mocked(useGameState).mockReturnValue(mockGameState({ id: 'test-battle', phase: 'battle_over', mission: { status: 'success', type: 'FightOff' } }));
    render(<BattleView />);
    expect(screen.getByText('battle.victory')).toBeInTheDocument();
  });
});