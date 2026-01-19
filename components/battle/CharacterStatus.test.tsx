

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CharacterStatus from './CharacterStatus';
import { BattleParticipant } from '../../types';

vi.mock('../../i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key.startsWith('enemies.') ? key.split('.')[1].replace('_', ' ') : key }),
}));

vi.mock('@/hooks/battle/useBattleInteractionState', () => ({
  useBattleInteractionState: () => ({
    rangeDisplayWeaponInstanceId: null,
    setRangeDisplayWeapon: vi.fn(),
  }),
}));


const mockParticipant: BattleParticipant = {
  id: 'char1', type: 'character', name: 'Rook',
  stats: { toughness: 4 } as any,
  armor: 'combat_armor',
  actionsRemaining: 1,
  weapons: [],
  portraitUrl: 'test.png',
} as any;

describe('CharacterStatus', () => {
  it('renders character name and stats', () => {
    render(<CharacterStatus participant={mockParticipant} />);
    expect(screen.getByText('Rook')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('protective_devices.combat_armor')).toBeInTheDocument();
  });

  it('displays the correct number of action icons', () => {
    render(<CharacterStatus participant={mockParticipant} />);
    const iconsContainer = screen.getByText('battle.hud.actions').nextElementSibling;
    expect(iconsContainer!.querySelectorAll('svg')).toHaveLength(2);
    expect(iconsContainer!.querySelectorAll('.text-warning.fill-current')).toHaveLength(1);
  });
});
