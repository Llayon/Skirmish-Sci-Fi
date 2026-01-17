import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ActiveMissionCard from './ActiveMissionCard';
import { ActiveMission } from '../../types';

vi.mock('../../i18n', () => ({
  useTranslation: () => ({ t: (key: string, params?: object) => params ? `${key} ${JSON.stringify(params)}` : key }),
}));

describe('ActiveMissionCard', () => {
  const mockMission: ActiveMission = {
    id: 'm1', titleKey: 'title.access', descriptionKey: 'desc.access', patronType: 'corporation',
    dangerPay: { credits: 2 }, timeFrame: { turns: 2, descriptionKey: 'time.next' },
    turnAccepted: 3, missionType: 'Access',
  };

  it('renders mission details', () => {
    render(<ActiveMissionCard mission={mockMission} />);
    expect(screen.getByText('title.access')).toBeInTheDocument();
    expect(screen.getByText('patrons.corporation')).toBeInTheDocument();
  });

  it('calculates and displays the deadline', () => {
    render(<ActiveMissionCard mission={mockMission} />);
    // deadline = 3 (accepted) + 2 (turns) - 1 = 4
    expect(screen.getByText('dashboard.activeMission.deadline {"turn":4}')).toBeInTheDocument();
  });
});