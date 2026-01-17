import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ParticipantInfo from './ParticipantInfo';
import { BattleParticipant, Mission } from '../../types';

vi.mock('../../i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../services/data/items', () => ({ getWeaponById: () => ({ id: 'military_rifle', name: 'Military Rifle', traits: [] }) }));

const mockParticipant: BattleParticipant = {
  id: 'char1', type: 'character', name: 'Rook',
  stats: { reactions: 2, speed: 5, combat: 1, toughness: 4, savvy: 1, luck: 1 },
  weapons: [{ instanceId: 'w1', weaponId: 'military_rifle' }],
  activeEffects: [],
  currentLuck: 1,
} as any;

const mockMission: Mission = {
  type: 'FightOff',
  titleKey: 'mock.title',
  descriptionKey: 'mock.desc',
  status: 'in_progress',
};

describe('ParticipantInfo', () => {
  it('renders participant stats by default', () => {
    render(<ParticipantInfo participant={mockParticipant} mission={mockMission} participants={[]} multiplayerRole={null} />);
    expect(screen.getByText('Rook')).toBeInTheDocument();
    expect(screen.getByText('characterCard.react')).toBeInTheDocument();
  });

  it('switches to the loadout tab on click', () => {
    render(<ParticipantInfo participant={mockParticipant} mission={mockMission} participants={[]} multiplayerRole={null} />);
    fireEvent.click(screen.getByText('battle.infoPanel.loadoutTab'));
    expect(screen.getByText('weapons.military_rifle')).toBeInTheDocument();
  });
});