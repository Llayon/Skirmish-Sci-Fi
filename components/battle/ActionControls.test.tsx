import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ActionControls from './ActionControls';
import { BattleParticipant } from '../../types';
import { BattleLogic } from '../../hooks/useBattleLogic';
import { useTranslation } from '../../i18n/index.tsx';

// Mocks
vi.mock('../../i18n/index.tsx', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/stores', () => ({
    useMultiplayerStore: vi.fn(),
    useBattleStore: vi.fn(),
}));

const mockUseGameState = vi.fn();
vi.mock('@/hooks/useGameState', () => ({
    useGameState: mockUseGameState,
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return { ...actual, Loader: () => <div role="progressbar" /> };
});

const useMultiplayerStore = vi.mocked((await import('@/stores')).useMultiplayerStore);
const useBattleStore = vi.mocked((await import('@/stores')).useBattleStore);

const mockHandlers = {
    selectMoveAction: vi.fn(),
    selectBrawlAction: vi.fn(),
    selectShootAction: vi.fn(),
    selectInteractAction: vi.fn(),
    selectFollowUpMove: vi.fn(),
    skipFollowUpMove: vi.fn(),
    selectWeaponForAction: vi.fn(),
    selectBrawlWeapon: vi.fn(),
    handleUseConsumable: vi.fn(),
    cancelAction: vi.fn(),
    endTurn: vi.fn(),
};

const createMockBattleLogic = (overrides: Partial<BattleLogic['uiState']> = {}): BattleLogic => ({
    uiState: { mode: 'idle', ...overrides },
    handlers: mockHandlers,
} as any);

const createMockParticipant = (overrides: Partial<BattleParticipant> = {}): BattleParticipant => ({
    id: 'char1',
    type: 'character',
    name: 'Rook',
    actionsRemaining: 2,
    actionsTaken: { move: false, combat: false, dash: false, interact: false },
    weapons: [{ weaponId: 'military_rifle', instanceId: 'w1' }],
    activeEffects: [],
    consumables: [],
    position: {x: 1, y: 1},
    ...overrides,
} as BattleParticipant);

const defaultGameState = {
    battle: {
        mission: { type: 'Fight Off' },
        terrain: [],
        participants: [],
        followUpState: null,
    }
};

describe('ActionControls', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useMultiplayerStore.mockReturnValue(null);
        useBattleStore.mockReturnValue(null);
        mockUseGameState.mockReturnValue(defaultGameState);
    });

    it('renders standard actions for an idle character', () => {
        const participant = createMockParticipant();
        render(<ActionControls participant={participant} battleLogic={createMockBattleLogic()} />);

        expect(screen.getByRole('button', { name: 'tooltips.actions.move' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'tooltips.actions.dash' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'tooltips.actions.snapShot' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'tooltips.actions.aimedShot' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'buttons.endTurn' })).toBeInTheDocument();
    });

    it('disables aimed shot if character has moved', () => {
        const participant = createMockParticipant({ actionsTaken: { ...createMockParticipant().actionsTaken, move: true } });
        render(<ActionControls participant={participant} battleLogic={createMockBattleLogic()} />);
        
        expect(screen.getByRole('button', { name: 'tooltips.actions.aimedShot' })).toBeDisabled();
    });
    
    it('shows Brawl button when engaged', () => {
        const participant = createMockParticipant();
        mockUseGameState.mockReturnValue({
            battle: {
                ...defaultGameState.battle,
                participants: [
                    participant,
                    { id: 'enemy1', type: 'enemy', position: { x: 2, y: 1 } }
                ]
            }
        } as any);
        
        render(<ActionControls participant={participant} battleLogic={createMockBattleLogic()} />);
        
        expect(screen.getByRole('button', { name: 'tooltips.actions.brawl' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'tooltips.actions.snapShot' })).not.toBeInTheDocument();
    });

    it('shows only Flee button when Panicked', () => {
        const participant = createMockParticipant({ activeEffects: [{ sourceId: 'terrifying' }] } as any);
        render(<ActionControls participant={participant} battleLogic={createMockBattleLogic()} />);
        
        expect(screen.getByRole('button', { name: 'buttons.flee' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'tooltips.actions.move' })).not.toBeInTheDocument();
    });
    
    it('shows Follow Up controls when in follow up state', () => {
        const participant = createMockParticipant();
        mockUseGameState.mockReturnValue({
            battle: {
                ...defaultGameState.battle,
                participants: [participant],
                followUpState: { participantId: participant.id }
            }
        } as any);

        render(<ActionControls participant={participant} battleLogic={createMockBattleLogic()} />);
        
        expect(screen.getByRole('button', { name: 'buttons.followUpMove' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'buttons.followUpSkip' })).toBeInTheDocument();
    });

    it('shows loading state when pending action is for this participant', () => {
        useBattleStore.mockReturnValue('char1'); // pendingActionFor
        const participant = createMockParticipant();
        render(<ActionControls participant={participant} battleLogic={createMockBattleLogic()} />);
        
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
    
    it('calls the correct handler when a button is clicked', () => {
        const participant = createMockParticipant();
        render(<ActionControls participant={participant} battleLogic={createMockBattleLogic()} />);
        
        fireEvent.click(screen.getByRole('button', { name: 'tooltips.actions.move' }));
        expect(mockHandlers.selectMoveAction).toHaveBeenCalledWith('char1', false);
        
        fireEvent.click(screen.getByRole('button', { name: 'tooltips.actions.dash' }));
        expect(mockHandlers.selectMoveAction).toHaveBeenCalledWith('char1', true);
    });
});