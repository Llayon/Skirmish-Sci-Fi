import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnimationLayer from './AnimationLayer';
import { useBattleStore } from '../../stores';

vi.mock('../../stores', () => ({
  useBattleStore: vi.fn(),
}));
const useBattleStoreMock = vi.mocked(useBattleStore);

describe('AnimationLayer', () => {
  const gridRef = { current: document.createElement('div') };
  const gridContentElement = document.createElement('div');
  gridContentElement.setAttribute('data-testid', 'battle-grid-content');
  gridRef.current.appendChild(gridContentElement);

  vi.spyOn(gridRef.current, 'getBoundingClientRect').mockReturnValue({
    width: 800, height: 800, top: 0, left: 0, right: 800, bottom: 800, x: 0, y: 0, toJSON: () => {}
  });
  vi.spyOn(gridContentElement, 'getBoundingClientRect').mockReturnValue({
    width: 800, height: 800, top: 0, left: 0, right: 800, bottom: 800, x: 0, y: 0, toJSON: () => {}
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing if there is no animation', () => {
    useBattleStoreMock.mockImplementation((selector: any) => selector({ animation: null, battle: null }));
    const { container } = render(<AnimationLayer gridRef={gridRef} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a move animation path and token', () => {
    const state = {
      animation: { type: 'move', path: [{ x: 0, y: 0 }, { x: 2, y: 2 }], id: 'anim1' },
      animatingParticipantId: 'p1',
      battle: {
        gridSize: { width: 10, height: 10 },
        participants: [{ id: 'p1', type: 'character' }],
      },
    };
    useBattleStoreMock.mockImplementation((selector: any) => selector(state));
    const { container } = render(<AnimationLayer gridRef={gridRef} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('path')).toBeInTheDocument();
    expect(container.querySelector('animateMotion')).toBeInTheDocument();
  });

  it('renders a shoot animation laser line', () => {
    const state = {
      animation: { type: 'shoot', from: { x: 1, y: 1 }, to: { x: 5, y: 5 }, id: 'anim2' },
      animatingParticipantId: 'p1',
      battle: {
        gridSize: { width: 10, height: 10 },
        participants: [{ id: 'p1', type: 'character' }],
      },
    };
    useBattleStoreMock.mockImplementation((selector: any) => selector(state));
    const { container } = render(<AnimationLayer gridRef={gridRef} />);
    const line = container.querySelector('line');
    expect(line).toBeInTheDocument();
    expect(line).toHaveClass('laser');
  });
});