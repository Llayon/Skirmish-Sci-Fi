
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BattleGrid from './BattleGrid';
import { useBattleLogic } from '../../hooks/useBattleLogic';

vi.mock('../../hooks/useBattleLogic');
vi.mock('./BattleCell', () => ({ default: (props: any) => <div data-testid={`cell-${props.x}-${props.y}`} data-participant={props.participant?.id} /> }));
vi.mock('../../stores', () => ({ useMultiplayerStore: vi.fn(), useBattleStore: vi.fn(() => ({ actions: { setSelectedParticipantId: vi.fn() } })) }));
vi.mock('../../hooks/useGameState', () => ({
  useGameState: () => ({
    battle: {
      gridSize: { width: 5, height: 5 },
      participants: [{ id: 'char1', type: 'character', position: { x: 2, y: 2 }, name: 'Rook' }, { id: 'enemy1', type: 'enemy', position: { x: 3, y: 3 }, name: 'Guard #1' }],
      terrain: [],
      mission: { type: 'FightOff', itemPosition: null, searchedPositions: [], interactionHighlightPositions: new Set() },
    },
  }),
}));

const mockUseBattleLogic = vi.mocked(useBattleLogic);

describe('BattleGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBattleLogic.mockReturnValue({
      uiState: { mode: 'idle' },
      derivedData: { reachableCells: new Map(), hoveredPath: null, interactionHighlightPositions: new Set(), coverStatus: new Map() },
      handlers: {
        handleGridClick: vi.fn(),
        setHoveredPos: vi.fn(),
        cancelAction: vi.fn(),
        selectMoveAction: vi.fn(),
        selectShootAction: vi.fn(),
        selectBrawlAction: vi.fn(),
        selectInteractAction: vi.fn(),
        selectFollowUpMove: vi.fn(),
        skipFollowUpMove: vi.fn(),
        selectWeaponForAction: vi.fn(),
        selectBrawlWeapon: vi.fn(),
        handleUseConsumable: vi.fn(),
        endTurn: vi.fn(),
        setRangeDisplayWeapon: vi.fn(),
      },
      characterPerformingAction: null,
      validShootTargetIds: new Set(),
      rangeDisplayWeaponInstanceId: null,
    } as any);
  });

  it('renders a grid with the correct number of cells', () => {
    render(<BattleGrid battleLogic={mockUseBattleLogic()} />);
    expect(screen.getAllByTestId(/cell-\d+-\d+/)).toHaveLength(25);
  });

  it('places participants in the correct cells', () => {
    render(<BattleGrid battleLogic={mockUseBattleLogic()} />);
    expect(screen.getByTestId('cell-2-2')).toHaveAttribute('data-participant', 'char1');
    expect(screen.getByTestId('cell-3-3')).toHaveAttribute('data-participant', 'enemy1');
  });
});
