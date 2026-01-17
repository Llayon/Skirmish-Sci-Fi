import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InfoPanel from './InfoPanel';
import { BattleLogic } from '../../hooks/useBattleLogic';

vi.mock('./ReactionRollPanel', () => ({ default: () => <div data-testid="reaction-roll-panel" /> }));
vi.mock('./ParticipantInfo', () => ({ default: () => <div data-testid="participant-info" /> }));
vi.mock('./ActionControls', () => ({ default: () => <div data-testid="action-controls" /> }));
vi.mock('../../i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../stores', () => ({ useMultiplayerStore: vi.fn(), useBattleStore: vi.fn() }));
vi.mock('../../hooks/useGameState');

const { useBattleStore } = await import('../../stores');
const { useGameState } = await import('../../hooks/useGameState');

const mockParticipant = { id: 'char1', type: 'character', name: 'Rook', id_startsWith: () => true } as any;

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

const mockBattleLogic: BattleLogic = {
    uiState: { mode: 'idle' },
} as any;

describe('InfoPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBattleStore).mockReturnValue({ selectedParticipantId: 'char1', actions: { setSelectedParticipantId: vi.fn(), endTurn: vi.fn() } });
  });

  it('renders ReactionRollPanel during reaction_roll phase', () => {
    vi.mocked(useGameState).mockReturnValue(mockGameState({ phase: 'reaction_roll' }));
    render(<InfoPanel battleLogic={mockBattleLogic} />);
    expect(screen.getByTestId('reaction-roll-panel')).toBeInTheDocument();
  });

  it('renders ActionControls when it is the active character\'s turn', () => {
    vi.mocked(useGameState).mockReturnValue(mockGameState({ phase: 'quick_actions', activeParticipantId: 'char1', participants: [mockParticipant] }));
    render(<InfoPanel battleLogic={mockBattleLogic} />);
    expect(screen.getByTestId('action-controls')).toBeInTheDocument();
  });
});