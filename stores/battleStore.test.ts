import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createRng } from '@/services/engine/rng/rng';
import { useBattleStore } from '@/stores/battleStore';
import { useUiStore } from '@/stores/uiStore';
import { useMultiplayerStore } from '@/stores/multiplayerStore';
import { Battle, PlayerAction } from '../types';
import type { BattleEvent } from '@/services/engine/battle/types';
import { battleUseCases } from '../services';

// Mock dependencies
vi.mock('@/stores/uiStore');
vi.mock('@/stores/multiplayerStore', () => ({
  useMultiplayerStore: {
    getState: vi.fn(() => ({
      multiplayerRole: null,
      actions: {},
    })),
  },
}));
vi.mock('../services', () => ({
  battleUseCases: {
    processPlayerAction: vi.fn().mockReturnValue({ logs: [] }),
    advancePhase: vi.fn(),
    processEnemyTurn: vi.fn().mockReturnValue({ updatedBattle: { id: 'updated-battle' }, animation: null, duration: 0 }),
  },
  campaignUseCases: {},
}));

vi.mock('@/services/multiplayerService', () => ({
  multiplayerService: {
    send: vi.fn(),
  }
}));

const { multiplayerService } = await import('@/services/multiplayerService');

const mockBattle: Battle = { id: 'test-battle', participants: [], round: 1 } as unknown as Battle;

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const injectTestRng = (seed: number) => {
  useBattleStore.setState({ rng: createRng(seed) });
};

import { hashEngineBattleState } from '@/services/engine/battle/hashEngineBattleState';
import { CURRENT_ENGINE_SCHEMA_VERSION } from '@/services/engine/battle/types';

describe('battleStore', () => {
  beforeEach(() => {
    useBattleStore.getState().actions.resetBattle();
    vi.clearAllMocks();
  });

  it('should have correct initial state', () => {
    const state = useBattleStore.getState();
    expect(state.battle).toBeNull();
    expect(state.selectedParticipantId).toBeNull();
    expect(state.isProcessingEnemies).toBe(false);
  });

  it('setNewBattle should set the battle state', () => {
    useBattleStore.getState().actions.setNewBattle(mockBattle);
    expect(useBattleStore.getState().battle).toEqual(mockBattle);
  });

  it('setSelectedParticipantId should update the selected participant ID', () => {
    useBattleStore.getState().actions.setSelectedParticipantId('player1');
    expect(useBattleStore.getState().selectedParticipantId).toBe('player1');
  });

  it('endBattle should change the game mode to post_battle for solo games', () => {
    const setGameModeMock = vi.fn();
    (useUiStore as unknown as { getState: () => { actions: { setGameMode: () => void } } }).getState = () => ({ actions: { setGameMode: setGameModeMock } });
    
    // Need a battle to exist first
    useBattleStore.getState().actions.setNewBattle(mockBattle);

    useBattleStore.getState().actions.endBattle();
    expect(setGameModeMock).toHaveBeenCalledWith('post_battle');
  });

  it('dispatchAction should call battleUseCases.processPlayerAction', () => {
    useBattleStore.getState().actions.setNewBattle(mockBattle);
    const mockAction = { type: 'move', payload: {} } as unknown as PlayerAction;
    
    useBattleStore.getState().actions.dispatchAction(mockAction);

    expect(battleUseCases.processPlayerAction).toHaveBeenCalled();
  });

  it('resetBattle should restore the initial state', () => {
    useBattleStore.getState().actions.setNewBattle(mockBattle);
    useBattleStore.getState().actions.setSelectedParticipantId('player1');
    
    useBattleStore.getState().actions.resetBattle();
    
    const state = useBattleStore.getState();
    expect(state.battle).toBeNull();
    expect(state.selectedParticipantId).toBeNull();
  });

  it('advancePhase should call battleUseCases.advancePhase', () => {
    useBattleStore.getState().actions.setNewBattle(mockBattle);
    useBattleStore.getState().actions.advancePhase();
    expect(battleUseCases.advancePhase).toHaveBeenCalled();
  });

  it('processEnemyTurn should call battleUseCases.processEnemyTurn and update the battle state', async () => {
    useBattleStore.getState().actions.setNewBattle(mockBattle);
    
    await useBattleStore.getState().actions.processEnemyTurn('enemy1');

    expect(battleUseCases.processEnemyTurn).toHaveBeenCalledWith(
      expect.anything(), // battle state
      'enemy1',
      null // multiplayerRole
    );
    
    // Check if the battle state was updated with the mock return value
    expect(useBattleStore.getState().battle?.id).toBe('updated-battle');
  });

  describe('multiplayer guest behavior', () => {
    beforeEach(() => {
      // Set the multiplayer role for these tests
      vi.mocked(useMultiplayerStore.getState).mockReturnValue({ 
        multiplayerRole: 'guest',
        actions: {}
      } as unknown as any);
    });

    it('dispatchAction should set pendingActionFor and send a message via multiplayerService', async () => {
      useBattleStore.getState().actions.setNewBattle(mockBattle);
      const mockAction = { type: 'move', payload: { characterId: 'player1' } } as unknown as PlayerAction;

      useBattleStore.getState().actions.dispatchAction(mockAction);
      await flushPromises();

      expect(useBattleStore.getState().pendingActionFor).toBe('player1');
      expect(multiplayerService.send).toHaveBeenCalledWith({ type: 'PLAYER_ACTION', payload: mockAction });
      // It should NOT process the action locally
      expect(battleUseCases.processPlayerAction).not.toHaveBeenCalled();
    });

    it('setBattle should clear pendingActionFor when receiving an update', () => {
      useBattleStore.getState().actions.setNewBattle(mockBattle);
      // Manually set pending state
      useBattleStore.setState({ pendingActionFor: 'player1' });
      expect(useBattleStore.getState().pendingActionFor).toBe('player1');

      // Simulate receiving a BATTLE_UPDATE
      useBattleStore.getState().actions.setBattle(b => {
        b.round = 2;
      });

      expect(useBattleStore.getState().pendingActionFor).toBeNull();
    });
  });

  describe('multiplayer host behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.mocked(useMultiplayerStore.getState).mockReturnValue({ 
        multiplayerRole: 'host',
        actions: {}
      } as unknown as any);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('dispatchAction should process the action directly', () => {
      useBattleStore.getState().actions.setNewBattle(mockBattle);
      const mockAction = { type: 'move', payload: {} } as unknown as PlayerAction;

      useBattleStore.getState().actions.dispatchAction(mockAction);
      
      expect(battleUseCases.processPlayerAction).toHaveBeenCalled();
      // Send is debounced, so it shouldn't be called immediately
      expect(multiplayerService.send).not.toHaveBeenCalled();
    });

    it('setBattle should debounce sending BATTLE_UPDATE messages', async () => {
      useBattleStore.getState().actions.setNewBattle(mockBattle);
      
      // Call setBattle multiple times
      useBattleStore.getState().actions.setBattle(b => { b.round = 2; });
      useBattleStore.getState().actions.setBattle(b => { b.round = 3; });
      useBattleStore.getState().actions.setBattle(b => { b.round = 4; });
      
      expect(multiplayerService.send).not.toHaveBeenCalled();

      // Fast-forward time
      vi.advanceTimersByTime(150); // debounce is 100ms, so 150ms should be enough
      await flushPromises();

      expect(multiplayerService.send).toHaveBeenCalledTimes(1);
      expect(multiplayerService.send).toHaveBeenCalledWith({
        type: 'BATTLE_UPDATE',
        payload: expect.objectContaining({ round: 4 }), // Should send the latest state
      });
    });
  });

  describe('Engine V2 Event Stream', () => {
    it('enqueueEvents should append events', () => {
      const event1: BattleEvent = { type: 'REACTION_ROLLED', participantId: 'p1', roll: 1, success: false };
      const event2: BattleEvent = { type: 'TURN_ORDER_SET', quick: [], slow: [] };
      
      useBattleStore.getState().actions.enqueueEvents([event1]);
      expect(useBattleStore.getState().events).toEqual([event1]);
      
      useBattleStore.getState().actions.enqueueEvents([event2]);
      expect(useBattleStore.getState().events).toEqual([event1, event2]);
    });

    it('advanceEventCursor should increment cursor and clamp', () => {
      const events = [1, 2, 3].map((): BattleEvent => ({ type: 'TURN_ORDER_SET', quick: [], slow: [] }));
      useBattleStore.getState().actions.enqueueEvents(events);
      
      expect(useBattleStore.getState().eventCursor).toBe(0);
      
      useBattleStore.getState().actions.advanceEventCursor();
      expect(useBattleStore.getState().eventCursor).toBe(1);
      
      useBattleStore.getState().actions.advanceEventCursor(2);
      expect(useBattleStore.getState().eventCursor).toBe(3);
      
      // Clamp
      useBattleStore.getState().actions.advanceEventCursor(5);
      expect(useBattleStore.getState().eventCursor).toBe(3);
    });

    it('resetEventStream should clear events and log', () => {
        const events: BattleEvent[] = [{ type: 'TURN_ORDER_SET', quick: [], slow: [] }];
        useBattleStore.getState().actions.enqueueEvents(events);
        useBattleStore.getState().actions.enqueueEngineLog([{ key: 'log.test' }]);
        useBattleStore.getState().actions.advanceEventCursor();

        useBattleStore.getState().actions.resetEventStream();

        const state = useBattleStore.getState();
        expect(state.events).toEqual([]);
        expect(state.engineLog).toEqual([]);
        expect(state.eventCursor).toBe(0);
    });
  });

  describe('Engine V2 Integration', () => {
    beforeEach(() => {
      useBattleStore.getState().actions.resetBattle();
      // Ensure multiplayer role is null for these tests
      vi.mocked(useMultiplayerStore.getState).mockReturnValue({ 
        multiplayerRole: null,
        actions: {}
      } as unknown as any);
    });

    it('dispatchEngineAction: MOVE_PARTICIPANT', () => {
      const battle = {
        id: 'b1',
        participants: [{ id: 'c1', type: 'character', position: { x: 0, y: 0 } }],
        round: 1
      } as Battle;

      // 1. Set battle and RNG
      useBattleStore.getState().actions.setNewBattle(battle);
      // Manually inject RNG for test control
      injectTestRng(1);
      // Enable V2 for this test
      useBattleStore.getState().actions.setEngineV2Enabled(true);

      // 2. Dispatch
      useBattleStore.getState().actions.dispatchEngineAction({
        type: 'MOVE_PARTICIPANT',
        participantId: 'c1',
        to: { x: 1, y: 1 }
      });

      // 3. Verify
      const state = useBattleStore.getState();
      
      // Battle updated
      const moved = state.battle?.participants.find(p => p.id === 'c1');
      expect(moved?.position).toEqual({ x: 1, y: 1 });

      // Events appended
      expect(state.events).toHaveLength(1);
      expect(state.events[0].type).toBe('PARTICIPANT_MOVED');

      // Log appended
      expect(state.engineLog).toHaveLength(1);
      expect(state.engineLog[0].key).toBe('log.action.move');

      // Cursor unchanged (consumed by UI later)
      expect(state.eventCursor).toBe(0);
    });

    it('dispatchEngineAction: ROLL_INITIATIVE consumes RNG', () => {
      const battle = {
        id: 'b1',
        phase: 'reaction_roll',
        participants: [
          { id: 'c1', type: 'character', position: { x: 0, y: 0 }, stats: { reactions: 1 } },
          { id: 'c2', type: 'character', position: { x: 1, y: 0 }, stats: { reactions: 1 } }
        ],
        round: 1
      } as Battle;

      useBattleStore.getState().actions.setNewBattle(battle);
      const startRng = createRng(123);
      injectTestRng(123);
      // Enable V2 for this test
      useBattleStore.getState().actions.setEngineV2Enabled(true);

      useBattleStore.getState().actions.dispatchEngineAction({
        type: 'ROLL_INITIATIVE'
      });

      const state = useBattleStore.getState();
      
      // RNG advanced (2 rolls)
      expect(state.rng?.cursor).toBe(startRng.cursor + 2);
      
      // Events emitted
      expect(state.events.some(e => e.type === 'REACTION_ROLLED')).toBe(true);
    });
  });

  describe('Engine V2 Feature Flag & State Tracking', () => {
    beforeEach(() => {
      useBattleStore.getState().actions.resetBattle();
      vi.mocked(useMultiplayerStore.getState).mockReturnValue({
        multiplayerRole: null,
        actions: {}
      } as unknown as any);
    });

    it('dispatchEngineAction: no-op when engineV2Enabled is false', () => {
      const battle = {
        id: 'b1',
        participants: [{ id: 'c1', type: 'character', position: { x: 0, y: 0 } }],
        round: 1
      } as Battle;

      useBattleStore.getState().actions.setNewBattle(battle);
      useBattleStore.setState({
        rng: createRng(1),
        engineV2Enabled: false  // Disabled
      });

      const initialPosition = useBattleStore.getState().battle?.participants[0].position;

      useBattleStore.getState().actions.dispatchEngineAction({
        type: 'MOVE_PARTICIPANT',
        participantId: 'c1',
        to: { x: 5, y: 5 }
      });

      const state = useBattleStore.getState();
      
      // Position unchanged
      expect(state.battle?.participants[0].position).toEqual(initialPosition);
      
      // No events/logs
      expect(state.events).toHaveLength(0);
      expect(state.engineLog).toHaveLength(0);
      expect(state.engineActionLog).toHaveLength(0);
      
      // No hash
      expect(state.lastEngineStateHash).toBeNull();
    });

    it('dispatchEngineAction: saves stateHash when enabled', () => {
      const battle = {
        id: 'b1',
        participants: [{ id: 'c1', type: 'character', position: { x: 0, y: 0 } }],
        round: 1
      } as Battle;

      useBattleStore.getState().actions.setNewBattle(battle);
      useBattleStore.setState({
        rng: createRng(123),
        engineV2Enabled: true  // Enabled
      });

      useBattleStore.getState().actions.dispatchEngineAction({
        type: 'MOVE_PARTICIPANT',
        participantId: 'c1',
        to: { x: 1, y: 1 }
      });

      const state = useBattleStore.getState();
      
      // Hash saved and valid format (FNV-1a hex 8 chars)
      expect(state.lastEngineStateHash).toMatch(/^[0-9a-f]{8}$/);
    });

    it('dispatchEngineAction: appends to engineActionLog', () => {
      const battle = {
        id: 'b1',
        participants: [{ id: 'c1', type: 'character', position: { x: 0, y: 0 } }],
        round: 1
      } as Battle;

      useBattleStore.getState().actions.setNewBattle(battle);
      useBattleStore.setState({
        rng: createRng(123),
        engineV2Enabled: true
      });

      const action1 = { type: 'MOVE_PARTICIPANT' as const, participantId: 'c1', to: { x: 1, y: 0 } };
      const action2 = { type: 'MOVE_PARTICIPANT' as const, participantId: 'c1', to: { x: 2, y: 0 } };

      useBattleStore.getState().actions.dispatchEngineAction(action1);
      useBattleStore.getState().actions.dispatchEngineAction(action2);

      const state = useBattleStore.getState();
      
      expect(state.engineActionLog).toHaveLength(2);
      expect(state.engineActionLog[0]).toEqual(action1);
      expect(state.engineActionLog[1]).toEqual(action2);
    });

    it('resetEventStream: clears only stream data, not history', () => {
      useBattleStore.setState({
        events: [{ type: 'TURN_ORDER_SET', quick: [], slow: [] }],
        eventCursor: 1,
        engineLog: [{ key: 'test' }],
        engineActionLog: [{ type: 'ROLL_INITIATIVE' }],
        lastEngineStateHash: 'abcd1234'
      });

      useBattleStore.getState().actions.resetEventStream();

      const state = useBattleStore.getState();
      expect(state.events).toEqual([]);
      expect(state.eventCursor).toBe(0);
      expect(state.engineLog).toEqual([]);
      // History preserved
      expect(state.engineActionLog).toHaveLength(1);
      expect(state.lastEngineStateHash).toBe('abcd1234');
    });

    it('resetEngineTracking: clears actionLog and hash', () => {
      useBattleStore.setState({
        engineActionLog: [{ type: 'ROLL_INITIATIVE' }],
        lastEngineStateHash: 'abcd1234'
      });

      useBattleStore.getState().actions.resetEngineTracking();

      const state = useBattleStore.getState();
      expect(state.engineActionLog).toEqual([]);
      expect(state.lastEngineStateHash).toBeNull();
    });

    it('setEngineV2Enabled: toggles flag', () => {
      // Force initial state to avoid flaky default test
      useBattleStore.getState().actions.setEngineV2Enabled(false);
      expect(useBattleStore.getState().engineV2Enabled).toBe(false);
      
      useBattleStore.getState().actions.setEngineV2Enabled(true);
      expect(useBattleStore.getState().engineV2Enabled).toBe(true);
      
      useBattleStore.getState().actions.setEngineV2Enabled(false);
      expect(useBattleStore.getState().engineV2Enabled).toBe(false);
    });

    it('stateHash determinism: same actions produce same hash', () => {
      const battle = {
        id: 'b1',
        participants: [{ id: 'c1', type: 'character', position: { x: 0, y: 0 } }],
        round: 1
      } as Battle;

      // Run 1
      useBattleStore.getState().actions.resetBattle();
      useBattleStore.getState().actions.setNewBattle({ ...battle });
      useBattleStore.setState({ rng: createRng(123), engineV2Enabled: true });
      useBattleStore.getState().actions.dispatchEngineAction({
        type: 'MOVE_PARTICIPANT', participantId: 'c1', to: { x: 1, y: 1 }
      });
      const hash1 = useBattleStore.getState().lastEngineStateHash;

      // Run 2
      useBattleStore.getState().actions.resetBattle();
      useBattleStore.getState().actions.setNewBattle({ ...battle });
      useBattleStore.setState({ rng: createRng(123), engineV2Enabled: true });
      useBattleStore.getState().actions.dispatchEngineAction({
        type: 'MOVE_PARTICIPANT', participantId: 'c1', to: { x: 1, y: 1 }
      });
      const hash2 = useBattleStore.getState().lastEngineStateHash;

      expect(hash1).toBe(hash2);
    });
  });

  describe('Engine V2 Replay & Resync', () => {
    beforeEach(() => {
        useBattleStore.getState().actions.resetBattle();
        useBattleStore.getState().actions.setEngineV2Enabled(true);
        vi.mocked(useMultiplayerStore.getState).mockReturnValue({ 
            multiplayerRole: null, 
            actions: {} 
        } as unknown as any);
    });

    it('captureEngineBaseline: sets baseline and hash, maintains immutability', () => {
        const battle = { id: 'b1', round: 1 } as Battle;
        useBattleStore.getState().actions.setNewBattle(battle);
        useBattleStore.setState({ rng: createRng(1) });

        useBattleStore.getState().actions.captureEngineBaseline();

        const state = useBattleStore.getState();
        expect(state.engineBaseline?.battle.id).toBe('b1');
        expect(state.engineBaselineHash).toBeTruthy();
        expect(state.lastEngineStateHash).toBe(state.engineBaselineHash);
        expect(state.engineActionLog).toEqual([]);

        // Test immutability
        useBattleStore.getState().actions.setBattle(b => { b.round = 2; });
        expect(useBattleStore.getState().engineBaseline?.battle.round).toBe(1);
    });

    it('verifyEngineReplay: validates consistency', () => {
        const battle = { id: 'b1', participants: [{ id: 'c1', type: 'character', position: { x: 0, y: 0 } }] } as Battle;
        useBattleStore.getState().actions.setNewBattle(battle);
        useBattleStore.setState({ rng: createRng(1) });
        
        useBattleStore.getState().actions.captureEngineBaseline();
        
        useBattleStore.getState().actions.dispatchEngineAction({
            type: 'MOVE_PARTICIPANT', participantId: 'c1', to: { x: 1, y: 1 }
        });

        const verify = useBattleStore.getState().actions.verifyEngineReplay();
        expect(verify.ok).toBe(true);
        if (verify.ok) {
            expect(verify.replayedHash).toBe(useBattleStore.getState().lastEngineStateHash);
        }

        // Test mismatch
        useBattleStore.setState({ lastEngineStateHash: 'fake_hash' });
        const verifyMismatch = useBattleStore.getState().actions.verifyEngineReplay();
        expect(verifyMismatch.ok).toBe(false);
        if (!verifyMismatch.ok) {
            // Explicit cast or check to satisfy TS that reason exists on !ok branch
            const reason = 'reason' in verifyMismatch ? verifyMismatch.reason : null;
            expect(reason).toBe('hash_mismatch');
        } else {
            throw new Error('Expected verify to fail');
        }
    });

    it('replayAndApplyEngine: restores state from baseline + log', () => {
        const battle = { id: 'b1', participants: [{ id: 'c1', type: 'character', position: { x: 0, y: 0 } }] } as Battle;
        useBattleStore.getState().actions.setNewBattle(battle);
        useBattleStore.setState({ rng: createRng(1) });
        
        useBattleStore.getState().actions.captureEngineBaseline();
        
        // Dispatch action
        useBattleStore.getState().actions.dispatchEngineAction({
            type: 'MOVE_PARTICIPANT', participantId: 'c1', to: { x: 1, y: 1 }
        });
        
        const expectedState = useBattleStore.getState().battle;
        const expectedHash = useBattleStore.getState().lastEngineStateHash;

        // Corrupt state
        useBattleStore.setState({ battle: null, rng: null });

        // Replay
        useBattleStore.getState().actions.replayAndApplyEngine();

        const state = useBattleStore.getState();
        expect(state.battle).toEqual(expectedState);
        expect(state.lastEngineStateHash).toBe(expectedHash);
    });

    it('applyEngineSnapshot: updates baseline and state, clears logs', () => {
        const battle = { id: 'b1', round: 5 } as Battle;
        const rng = createRng(999);
        const snapshot = {
            schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
            battle,
            rng,
            stateHash: hashEngineBattleState({ schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, battle, rng })
        };

        useBattleStore.setState({
            engineActionLog: [{ type: 'ROLL_INITIATIVE' }],
            events: [{ type: 'TURN_ORDER_SET', quick: [], slow: [] }]
        });

        useBattleStore.getState().actions.applyEngineSnapshot(snapshot);

        const state = useBattleStore.getState();
        expect(state.battle).toEqual(battle);
        expect(state.rng).toEqual(rng);
        expect(state.lastEngineStateHash).toBe(snapshot.stateHash);
        expect(state.engineBaseline?.battle).toEqual(battle);
        expect(state.engineBaselineHash).toBe(snapshot.stateHash);
        
        // Logs cleared
        expect(state.engineActionLog).toEqual([]);
        expect(state.events).toEqual([]);
    });
  });
});
