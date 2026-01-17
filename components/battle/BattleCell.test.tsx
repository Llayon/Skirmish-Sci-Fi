
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BattleCell from './BattleCell';
import type { BattleCellParticipantViewModel } from '@/types';

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return { ...actual, User: () => <div data-testid="user-icon" />, Bot: () => <div data-testid="bot-icon" />, Skull: () => <div data-testid="skull-icon" /> };
});

describe('BattleCell', () => {
  const defaultProps = { x: 1, y: 1, onCellClick: vi.fn(), onHover: vi.fn(), cellStyle: {}, cellBorder: 'border-border', cellIcon: null, isClickable: false, isPathEnd: false, isReachableMoveCell: false, providesCoverForMove: false, isItemOnGround: false, isSearched: false };

  it('renders a participant token when provided', () => {
    const participant: BattleCellParticipantViewModel = { id: 'p1', name: 'Rook', type: 'character', status: 'active', stunTokens: 0, isOpponent: false, isItemCarrier: false, isSelected: true, isActive: true, isAnimating: false, isPending: false, hasCoverFromAttacker: false };
    render(<BattleCell {...defaultProps} participant={participant} />);
    expect(screen.getByTitle('Rook')).toBeInTheDocument();
    expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    expect(screen.getByTitle('Rook')).toHaveClass('bg-primary', 'ring-warning', 'animate-pulse');
  });

  it('renders an opponent token correctly', () => {
    const participant: BattleCellParticipantViewModel = { id: 'e1', name: 'Guard', type: 'enemy', status: 'active', stunTokens: 0, isOpponent: true, isItemCarrier: false, isSelected: false, isActive: false, isAnimating: false, isPending: false, hasCoverFromAttacker: false };
    render(<BattleCell {...defaultProps} participant={participant} />);
    expect(screen.getByTitle('Guard')).toBeInTheDocument();
    expect(screen.getByTestId('bot-icon')).toBeInTheDocument();
    expect(screen.getByTitle('Guard')).toHaveClass('bg-danger');
  });

  it('renders casualty status correctly', () => {
    const participant: BattleCellParticipantViewModel = { id: 'p1', name: 'Rook', type: 'character', status: 'casualty', stunTokens: 0, isOpponent: false, isItemCarrier: false, isSelected: false, isActive: false, isAnimating: false, isPending: false, hasCoverFromAttacker: false };
    render(<BattleCell {...defaultProps} participant={participant} />);
    expect(screen.getByTitle('Rook')).toHaveClass('opacity-40');
    expect(screen.getByTestId('skull-icon')).toBeInTheDocument();
  });
});
