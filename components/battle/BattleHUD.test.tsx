import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BattleHUD from './BattleHUD';
import { GameMode } from '../../stores';

vi.mock('./MissionPanel', () => ({ default: () => <div data-testid="mission-panel" /> }));
vi.mock('./BattleLog', () => ({ default: () => <div data-testid="battle-log" /> }));
vi.mock('./ActionControls', () => ({ default: () => <div data-testid="action-controls" /> }));
vi.mock('./ReactionRollPanel', () => ({ default: () => <div data-testid="reaction-roll-panel" /> }));
vi.mock('./CharacterStatus', () => ({ default: () => <div data-testid="character-status" /> }));
vi.mock('../../i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../stores', () => ({ useMultiplayerStore: vi.fn(), useBattleStore: vi.fn() }));
vi.mock('../../hooks/useGameState');

const { useBattleStore, useMultiplayerStore } = await import('../../stores');
const { useGameState } = await import('../../hooks/useGameState');

const mockGameState = (battleOverride: any) => ({
    battle: battleOverride,
    crew: null,
    campaign: null,
    gameMode: 'battle' as const,
    gameStats: { totalCrewMembers: 0, availableCredits: 0, currentTurn: 1, activeMissions: 0, battleInProgress: true },
    uiState: { isInBattle: true, isInCampaign: false, isCreatingCrew: false, canStartBattle: false, needsUpkeep: false },
    validation: { hasValidCrew: false, hasActiveCampaign: false, canAdvanceTurn: false, hasEnoughCredits: () => false },
    isLoading: false,
    hasUnsavedChanges: false,
});


describe('BattleHUD', () => {
  const mockParticipant = { id: 'char1', type: 'character', name: 'Rook', actionsRemaining: 2, id_startsWith: (p: string) => true } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMultiplayerStore).mockImplementation((selector: any) => selector({ multiplayerRole: null }));
    vi.mocked(useBattleStore).mockImplementation((selector: any) =>
      selector({
        selectedParticipantId: 'char1',
        hoveredParticipantId: null,
        battle: { activeParticipantId: 'char1', activePlayerRole: null },
      })
    );
  });

  it('renders MissionPanel and BattleLog in all phases', () => {
    vi.mocked(useGameState).mockReturnValue(mockGameState({ mission: {}, log: [], phase: 'quick_actions', participants: [mockParticipant], activeParticipantId: 'char1' }));
    render(<BattleHUD battleLogic={{} as any} />);
    expect(screen.getByTestId('mission-panel')).toBeInTheDocument();
    expect(screen.getByTestId('battle-log')).toBeInTheDocument();
  });

  it('renders ReactionRollPanel during the reaction_roll phase', () => {
    vi.mocked(useGameState).mockReturnValue(mockGameState({ mission: {}, log: [], phase: 'reaction_roll' }));
    render(<BattleHUD battleLogic={{} as any} />);
    expect(screen.getByTestId('reaction-roll-panel')).toBeInTheDocument();
  });

  it('renders ActionControls when it is a player character\'s turn', () => {
    vi.mocked(useGameState).mockReturnValue(mockGameState({ mission: {}, log: [], phase: 'quick_actions', participants: [mockParticipant], activeParticipantId: 'char1' }));
    render(<BattleHUD battleLogic={{} as any} />);
    expect(screen.getByTestId('action-controls')).toBeInTheDocument();
  });
});
