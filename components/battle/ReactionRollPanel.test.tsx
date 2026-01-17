import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReactionRollPanel from './ReactionRollPanel';

vi.mock('../../i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../stores', () => ({ useBattleStore: vi.fn(), useCampaignProgressStore: vi.fn(), useMultiplayerStore: vi.fn() }));

const { useBattleStore, useCampaignProgressStore } = await import('../../stores');

describe('ReactionRollPanel', () => {
  const mockBattleActions = { dispatchAction: vi.fn(), advancePhase: vi.fn(), setBattle: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Roll and Seize buttons in solo mode', () => {
    vi.mocked(useBattleStore).mockReturnValue({ battle: { reactionRolls: {}, reactionRerollsUsed: false, participants: [] }, actions: mockBattleActions });
    vi.mocked(useCampaignProgressStore).mockReturnValue({ campaign: { storyPoints: 1 }, actions: {} });
    render(<ReactionRollPanel />);
    expect(screen.getByText('buttons.rollInitiative')).toBeInTheDocument();
    expect(screen.getByText('buttons.seizeInitiative', { exact: false })).toBeInTheDocument();
  });

  it('calls dispatchAction on Roll Initiative click', () => {
    vi.mocked(useBattleStore).mockReturnValue({ battle: { reactionRolls: {}, reactionRerollsUsed: false, participants: [] }, actions: mockBattleActions });
    vi.mocked(useCampaignProgressStore).mockReturnValue({ campaign: { storyPoints: 1 }, actions: {} });
    render(<ReactionRollPanel />);
    fireEvent.click(screen.getByText('buttons.rollInitiative'));
    expect(mockBattleActions.dispatchAction).toHaveBeenCalledWith({ type: 'roll_initiative', payload: {} });
  });
});