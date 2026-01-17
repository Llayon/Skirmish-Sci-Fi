import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MissionPanel from './MissionPanel';
import { Mission } from '../../types';

vi.mock('../../i18n', () => ({
  useTranslation: () => ({ t: (key: string, params?: object) => params ? `${key} ${JSON.stringify(params)}` : key }),
}));

describe('MissionPanel', () => {
  it('renders title and description', () => {
    const mission: Mission = { type: 'Access', titleKey: 'title.access', descriptionKey: 'desc.access', status: 'in_progress' };
    render(<MissionPanel mission={mission} />);
    expect(screen.getByText('title.access')).toBeInTheDocument();
    expect(screen.getByText('desc.access')).toBeInTheDocument();
  });

  it('renders progress for a Patrol mission', () => {
    const mission: Mission = { type: 'Patrol', titleKey: 't', descriptionKey: 'd', status: 'in_progress', patrolPoints: [{ id: 'p1', visited: true }, { id: 'p2', visited: false }] };
    render(<MissionPanel mission={mission} />);
    expect(screen.getByText('missions.progress.patrol {"visited":1,"total":2}')).toBeInTheDocument();
  });
});