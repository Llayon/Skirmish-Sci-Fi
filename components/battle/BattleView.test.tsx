import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BattleView from './BattleView';
import { GameMode } from '@/stores';

vi.mock('./BattleGrid', () => ({ default: () => <div data-testid="battle-grid" /> }));
vi.mock('./AnimationLayer', () => ({ default: () => <div data-testid="animation-layer" /> }));
vi.mock('./BattleHUD', () => ({ default: () => <div data-testid="battle-hud" /> }));
vi.mock('./BattleHudSettingsModal', () => ({ default: () => <div data-testid="hud-modal" /> }));
vi.mock('./BattleHelpOverlay', () => ({ default: () => <div data-testid="help-overlay" /> }));
vi.mock('../../i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/stores', () => ({ useMultiplayerStore: vi.fn(), useBattleStore: vi.fn(), useHudStore: vi.fn() }));
vi.mock('@/stores/settingsStore', () => ({ useSettingsStore: vi.fn() }));
vi.mock('../../hooks/useGameState');
vi.mock('../../hooks/useMultiplayer');
vi.mock('../../hooks/useBattleLogic', () => ({ useBattleLogic: vi.fn(() => ({ uiState: { mode: 'idle' }, handlers: { cancelAction: vi.fn() } })) }));

const { useBattleStore, useHudStore, useMultiplayerStore } = await import('@/stores');
const { useSettingsStore } = await import('@/stores/settingsStore');
const { useGameState } = await import('../../hooks/useGameState');
const { useMultiplayer } = await import('../../hooks/useMultiplayer');
const { useBattleLogic } = await import('../../hooks/useBattleLogic');

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
    const battleStoreState: any = {
      showEnemyTurnBanner: false,
      animatingParticipantId: null,
      selectedParticipantId: null,
      hoveredParticipantId: null,
      battle: {
        id: 'test-battle',
        phase: 'quick_actions',
        activeParticipantId: 'char1',
        activePlayerRole: null,
        participants: [
          { id: 'char1', type: 'character', name: 'Rook', position: { x: 0, y: 0 }, status: 'active' },
          { id: 'char2', type: 'character', name: 'Vale', position: { x: 1, y: 0 }, status: 'active' },
        ],
        mission: { status: 'in_progress', type: 'FightOff' },
        log: [],
      },
      actions: {
        endBattle: vi.fn(),
        setSelectedParticipantId: vi.fn(),
        requestCameraFocusOn: vi.fn(),
        requestCameraReset: vi.fn(),
      },
    };

    vi.mocked(useBattleStore).mockImplementation((selector: any) => selector(battleStoreState));
    vi.mocked(useMultiplayerStore).mockImplementation((selector: any) => selector({ multiplayerRole: null }));
    vi.mocked(useHudStore).mockImplementation((selector: any) =>
      selector({
        preset: 'full',
        actions: { togglePanel: vi.fn(), toggleCollapsed: vi.fn(), setDensity: vi.fn(), applyPreset: vi.fn(), reset: vi.fn() },
      })
    );
    vi.mocked(useSettingsStore).mockImplementation((selector: any) => selector({ reducedVfx: false }));
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

  it('opens HUD modal on H hotkey', () => {
    render(<BattleView />);
    fireEvent.keyDown(window, { key: 'h' });
    expect(screen.getByTestId('hud-modal')).toBeInTheDocument();
  });

  it('opens help overlay on ? hotkey', () => {
    render(<BattleView />);
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByTestId('help-overlay')).toBeInTheDocument();
  });

  it('calls cancelAction on Escape', () => {
    const cancelAction = vi.fn();
    vi.mocked(useBattleLogic).mockReturnValue({ uiState: { mode: 'move' }, handlers: { cancelAction } } as any);
    render(<BattleView />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(cancelAction).toHaveBeenCalled();
  });

  it('cycles selected participant on Tab', () => {
    const setSelectedParticipantId = vi.fn();
    vi.mocked(useBattleStore).mockImplementation((selector: any) =>
      selector({
        showEnemyTurnBanner: false,
        animatingParticipantId: null,
        selectedParticipantId: null,
        hoveredParticipantId: null,
        battle: {
          id: 'test-battle',
          phase: 'quick_actions',
          activeParticipantId: 'char1',
          activePlayerRole: null,
          participants: [
            { id: 'char1', type: 'character', name: 'Rook', position: { x: 0, y: 0 }, status: 'active' },
            { id: 'char2', type: 'character', name: 'Vale', position: { x: 1, y: 0 }, status: 'active' },
          ],
          mission: { status: 'in_progress', type: 'FightOff' },
          log: [],
        },
        actions: {
          endBattle: vi.fn(),
          setSelectedParticipantId,
          requestCameraFocusOn: vi.fn(),
          requestCameraReset: vi.fn(),
        },
      })
    );

    render(<BattleView />);
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(setSelectedParticipantId).toHaveBeenCalledWith('char2');
  });

  it('cycles selected participant backwards on Shift+Tab', () => {
    const setSelectedParticipantId = vi.fn();
    vi.mocked(useBattleStore).mockImplementation((selector: any) =>
      selector({
        showEnemyTurnBanner: false,
        animatingParticipantId: null,
        selectedParticipantId: null,
        hoveredParticipantId: null,
        battle: {
          id: 'test-battle',
          phase: 'quick_actions',
          activeParticipantId: 'char1',
          activePlayerRole: null,
          participants: [
            { id: 'char1', type: 'character', name: 'Rook', position: { x: 0, y: 0 }, status: 'active' },
            { id: 'char2', type: 'character', name: 'Vale', position: { x: 1, y: 0 }, status: 'active' },
          ],
          mission: { status: 'in_progress', type: 'FightOff' },
          log: [],
        },
        actions: {
          endBattle: vi.fn(),
          setSelectedParticipantId,
          requestCameraFocusOn: vi.fn(),
          requestCameraReset: vi.fn(),
        },
      })
    );

    render(<BattleView />);
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(setSelectedParticipantId).toHaveBeenCalledWith('char2');
  });

  it('does not trigger panel hotkeys while a modal is open', () => {
    const togglePanel = vi.fn();
    vi.mocked(useHudStore).mockImplementation((selector: any) =>
      selector({ preset: 'full', actions: { togglePanel, applyPreset: vi.fn() } })
    );
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    document.body.appendChild(dialog);

    render(<BattleView />);
    fireEvent.keyDown(window, { key: 'l' });
    expect(togglePanel).not.toHaveBeenCalled();

    document.body.removeChild(dialog);
  });

  it('cancels action on right click while not idle', () => {
    const cancelAction = vi.fn();
    vi.mocked(useBattleLogic).mockReturnValue({ uiState: { mode: 'move' }, handlers: { cancelAction } } as any);
    render(<BattleView />);
    fireEvent.contextMenu(screen.getByTestId('battlefield'));
    expect(cancelAction).toHaveBeenCalled();
  });
});
