import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BattleLog from './BattleLog';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn((opts: any) => ({
    getVirtualItems: () =>
      Array.from({ length: opts.count }, (_, index) => ({
        key: index,
        index,
        start: index * 22,
      })),
    getTotalSize: () => opts.count * 22,
    scrollToIndex: vi.fn(),
    measureElement: vi.fn(),
  })),
}));

vi.mock('../../i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: object) => params ? `${key} ${JSON.stringify(params)}` : key,
  }),
}));

describe('BattleLog', () => {
  it('renders simple string log entries', () => {
    const log = ['--- Round 1 ---', 'Player moves.'];
    render(<BattleLog log={log} />);
    expect(screen.getByText('--- Round 1 ---')).toBeInTheDocument();
    expect(screen.getByText('Player moves.')).toBeInTheDocument();
  });

  it('renders and translates LogEntry objects', () => {
    const log = [{ key: 'log.action.shoots', params: { attacker: 'Rook' } }];
    render(<BattleLog log={log as any} />);
    expect(screen.getByText('log.action.shoots')).toBeInTheDocument();
  });
});
