import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useBattleEventConsumer } from './useBattleEventConsumer';
import { useBattleStore } from '@/stores/battleStore';

describe('useBattleEventConsumer', () => {
  // Capture initial state to reset
  const initialStoreState = useBattleStore.getState();

  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    useBattleStore.setState(initialStoreState, true);
    
    // Ensure critical flags are set for testing default environment
    useBattleStore.setState({
      engineV2Enabled: true,
      events: [],
      eventCursor: 0,
      showEnemyTurnBanner: false,
      selectedParticipantId: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('advances cursor when pending event exists', async () => {
    useBattleStore.setState({
      events: [{ type: 'ROUND_INCREMENTED', round: 2 }],
      eventCursor: 0
    });

    renderHook(() => useBattleEventConsumer());

    await waitFor(() => {
      expect(useBattleStore.getState().eventCursor).toBe(1);
    });
  });

  it('does not advance when engineV2Enabled is false', async () => {
    useBattleStore.setState({
      engineV2Enabled: false,
      events: [{ type: 'ROUND_INCREMENTED', round: 2 }],
      eventCursor: 0
    });

    renderHook(() => useBattleEventConsumer());

    // Expect no change immediately
    expect(useBattleStore.getState().eventCursor).toBe(0);
  });

  it('PHASE_CHANGED -> enemy_actions shows banner', async () => {
    useBattleStore.setState({
      events: [{ type: 'PHASE_CHANGED', from: 'quick_actions', to: 'enemy_actions' }],
      eventCursor: 0,
      showEnemyTurnBanner: false,
    });

    renderHook(() => useBattleEventConsumer());

    await waitFor(() => {
      expect(useBattleStore.getState().showEnemyTurnBanner).toBe(true);
      expect(useBattleStore.getState().eventCursor).toBe(1);
    });
  });

  it('ACTIVE_PARTICIPANT_SET selects participant', async () => {
    useBattleStore.setState({
      events: [{ type: 'ACTIVE_PARTICIPANT_SET', participantId: 'p1' }],
      eventCursor: 0,
      selectedParticipantId: null,
    });

    renderHook(() => useBattleEventConsumer());

    await waitFor(() => {
      expect(useBattleStore.getState().selectedParticipantId).toBe('p1');
      expect(useBattleStore.getState().eventCursor).toBe(1);
    });
  });

  it('PARTICIPANT_MOVED triggers animation', async () => {
    const from = { x: 1, y: 1 };
    const to = { x: 2, y: 2 };
    const mockHash = 'deadbeef';
    
    useBattleStore.setState({
      events: [{ 
        type: 'PARTICIPANT_MOVED', 
        participantId: 'p1',
        from,
        to
      }],
      eventCursor: 0,
      animatingParticipantId: null,
      animation: null,
      lastEngineStateHash: mockHash,
    });

    renderHook(() => useBattleEventConsumer());

    await waitFor(() => {
      const state = useBattleStore.getState();
      expect(state.animatingParticipantId).toBe('p1');
      expect(state.animation).not.toBeNull();
      expect(state.animation?.type).toBe('move');
      if (state.animation?.type === 'move') {
        expect(state.animation.path).toEqual([from, to]);
        // Verify deterministic ID
        expect(state.animation.id).toBe(`move-p1-0-${mockHash}`);
      }
      expect(state.eventCursor).toBe(1);
    });
  });
});
