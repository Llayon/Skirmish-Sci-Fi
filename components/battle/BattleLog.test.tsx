import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('filters entries by category', () => {
    const log = [
      '--- Round 1 ---',
      { key: 'log.action.shoots', params: { attacker: 'Rook' } },
      { key: 'log.info.hit', params: {} },
    ];

    render(<BattleLog log={log as any} embedded />);

    expect(screen.getByText('--- Round 1 ---')).toBeInTheDocument();
    expect(screen.getByText('log.action.shoots')).toBeInTheDocument();
    expect(screen.getByText('log.info.hit')).toBeInTheDocument();

    fireEvent.click(screen.getByText('log.filters.actions'));
    expect(screen.getByText('log.action.shoots')).toBeInTheDocument();
    expect(screen.queryByText('log.info.hit')).toBeNull();
    expect(screen.queryByText('--- Round 1 ---')).toBeNull();

    fireEvent.click(screen.getByText('log.filters.info'));
    expect(screen.queryByText('log.action.shoots')).toBeNull();
    expect(screen.getByText('log.info.hit')).toBeInTheDocument();
    expect(screen.getByText('--- Round 1 ---')).toBeInTheDocument();
  });
});
