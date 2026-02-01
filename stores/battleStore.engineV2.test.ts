import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBattleStore } from '@/stores/battleStore';
import { useMultiplayerStore } from '@/stores/multiplayerStore';
import { createRng } from '@/services/engine/rng/rng';
import { CURRENT_ENGINE_SCHEMA_VERSION, BattleAction } from '@/services/engine/battle/types';
import { hashEngineBattleState } from '@/services/engine/battle/hashEngineBattleState';
import { reduceBattle } from '@/services/engine/battle/reduceBattle';
import { d6, d100 } from '@/services/engine/rng/rng';
import { multiplayerService } from '@/services/multiplayerService';

// Mocks
vi.mock('@/services/multiplayerService', () => ({
  multiplayerService: {
    send: vi.fn(),
  },
}));

// Mock reduceBattle to allow forcing errors
vi.mock('@/services/engine/battle/reduceBattle', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/services/engine/battle/reduceBattle')>();
    return {
        ...actual,
        reduceBattle: vi.fn(actual.reduceBattle),
    };
});

// Setup minimal valid state
const createMockBattle = () => ({
  id: 'test-battle-1',
  phase: 'reaction_roll',
  participants: [],
  gridSize: { width: 10, height: 10 },
  terrain: [],
  mission: { type: 'Patrol', status: 'active' },
  log: [],
  round: 1,
  quickActionOrder: [],
  slowActionOrder: [],
  enemyTurnOrder: [],
  reactionRolls: {},
  reactionRerollsUsed: false,
  currentTurnIndex: 0,
  activeParticipantId: null,
  followUpState: null,
} as any);

describe('Stage 6A: Engine V2 Multiplayer Store Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBattleStore.setState({
      battle: null,
      rng: null,
      engineV2Enabled: true,
      lastEngineStateHash: null,
      engineActionLog: [],
      engineBaseline: null,
      events: [],
      engineLog: [],
      engineNetResyncing: false,
      engineNetClientActionSeq: 0,
      engineNetPendingClientActionId: null,
      engineNetPendingPredictedHash: null,
      engineNetHostSeq: 0,
      engineNetRemoteSeq: 0,
      engineNetExpectedSeq: 1,
      engineNetActionBuffer: {},
    });
    useMultiplayerStore.setState({ multiplayerRole: null });
  });

  it('applyEngineActionFromNetwork applies action and updates hash', () => {
    const battle = createMockBattle();
    const rng = createRng(12345);
    
    // Setup initial state
    useBattleStore.setState({ battle, rng });
    
    // Calculate expected result externally
    const action: BattleAction = { type: 'ROLL_INITIATIVE' };
    const engineState = { schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, battle, rng };
    // Use actual implementation via mock wrapper
    const result = (reduceBattle as any).getMockImplementation()(engineState, action, { rng: { d6, d100 } });
    
    // Apply from network
    const applyResult = useBattleStore.getState().actions.applyEngineActionFromNetwork({
      action,
      resultingHash: result.stateHash,
      battleId: battle.id
    });

    expect(applyResult.ok).toBe(true);
    
    const state = useBattleStore.getState();
    expect(state.lastEngineStateHash).toBe(result.stateHash);
    expect(state.engineActionLog).toHaveLength(1);
    expect(state.engineActionLog[0]).toEqual(action);
    // Baseline should be captured automatically
    expect(state.engineBaseline).not.toBeNull();
  });

  it('applyEngineActionFromNetwork detects hash mismatch', () => {
    const battle = createMockBattle();
    const rng = createRng(12345);
    useBattleStore.setState({ battle, rng });

    const action: BattleAction = { type: 'ROLL_INITIATIVE' };
    
    // Provide WRONG hash
    const applyResult = useBattleStore.getState().actions.applyEngineActionFromNetwork({
      action,
      resultingHash: 'bad-hash-dead-beef',
      battleId: battle.id
    });

    expect(applyResult.ok).toBe(false);
    expect(applyResult.reason).toBe('hash_mismatch');
    expect(applyResult.expected).toBe('bad-hash-dead-beef');
    
    // State should NOT be updated on mismatch to prevent further corruption
    const state = useBattleStore.getState();
    expect(state.engineActionLog).toHaveLength(0);
    // Should trigger resync mode
    expect(state.engineNetResyncing).toBe(true);
  });

  it('createEngineSnapshotForNetwork creates valid snapshot', () => {
    const battle = createMockBattle();
    const rng = createRng(12345);
    useBattleStore.setState({ battle, rng });

    const snapshotData = useBattleStore.getState().actions.createEngineSnapshotForNetwork();
    
    expect(snapshotData).not.toBeNull();
    expect(snapshotData?.snapshot.schemaVersion).toBe(CURRENT_ENGINE_SCHEMA_VERSION);
    expect(snapshotData?.battleId).toBe(battle.id);
    expect(snapshotData?.seq).toBe(0);
    
    // Verify hash matches snapshot content
    const calculatedHash = hashEngineBattleState(snapshotData!.snapshot);
    expect(snapshotData?.hash).toBe(calculatedHash);
  });

  it('applyEngineSnapshotFromNetwork restores state and resets log', () => {
    // 1. Create source state
    const battle = createMockBattle();
    const rng = createRng(12345);
    const engineState = { schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, battle, rng };
    const hash = hashEngineBattleState(engineState);

    // 2. Pollute current state
    useBattleStore.setState({
      battle: createMockBattle(), // different battle
      engineActionLog: [{ type: 'ROLL_INITIATIVE' }], // garbage log
      lastEngineStateHash: 'old-hash',
      engineNetResyncing: true // Simulate resync state
    });

    // 3. Apply snapshot
    useBattleStore.getState().actions.applyEngineSnapshotFromNetwork({
      snapshot: engineState,
      hash,
      battleId: battle.id,
      seq: 10
    });

    const state = useBattleStore.getState();
    expect(state.lastEngineStateHash).toBe(hash);
    expect(state.engineActionLog).toHaveLength(0); // Log cleared
    expect(state.events).toHaveLength(0); // Events cleared
    expect(state.engineBaseline).toEqual(engineState); // Baseline updated
    expect(state.engineNetResyncing).toBe(false); // Resync flag cleared
    expect(state.engineNetRemoteSeq).toBe(10);
    expect(state.engineNetExpectedSeq).toBe(11);
  });

  it('invalid action triggers resync flag', () => {
    const battle = createMockBattle();
    const rng = createRng(12345);
    useBattleStore.setState({ battle, rng, engineV2Enabled: true });

    // Force reduceBattle to throw
    (reduceBattle as any).mockImplementationOnce(() => {
        throw new Error('Simulated engine crash');
    });

    const action: BattleAction = { type: 'ROLL_INITIATIVE' };
    const applyResult = useBattleStore.getState().actions.applyEngineActionFromNetwork({
        action,
        resultingHash: 'some-hash',
        battleId: battle.id
    });

    expect(applyResult.ok).toBe(false);
    expect(applyResult.reason).toBe('invalid_action');
    expect(applyResult.errorMessage).toBe('Simulated engine crash');

    const state = useBattleStore.getState();
    expect(state.engineNetResyncing).toBe(true);
  });
});

describe('Stage 6B: Engine V2 Guest Proposals', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useBattleStore.setState({
            battle: null,
            rng: null,
            engineV2Enabled: true,
            lastEngineStateHash: null,
            engineActionLog: [],
            engineBaseline: null,
            events: [],
            engineLog: [],
            engineNetResyncing: false,
            engineNetClientActionSeq: 0,
            engineNetPendingClientActionId: null,
            engineNetPendingPredictedHash: null,
            engineNetHostSeq: 0,
            engineNetRemoteSeq: 0,
            engineNetExpectedSeq: 1,
            engineNetActionBuffer: {},
        });
        useMultiplayerStore.setState({ multiplayerRole: null });
    });

    it('Guest dispatchEngineAction proposes and applies optimistically', () => {
        const battle = createMockBattle();
        const rng = createRng(12345);
        useBattleStore.setState({ battle, rng });
        useMultiplayerStore.setState({ multiplayerRole: 'guest' });

        useBattleStore.getState().actions.dispatchEngineAction({ type: 'ROLL_INITIATIVE' });

        const state = useBattleStore.getState();
        
        // 1. Check message sent
        expect(multiplayerService.send).toHaveBeenCalledWith(expect.objectContaining({
            type: 'ENGINE_PROPOSE_ACTION',
            payload: expect.objectContaining({
                action: { type: 'ROLL_INITIATIVE' },
                clientActionId: expect.stringContaining(battle.id),
            })
        }));

        // 2. Check optimistic state
        expect(state.engineNetPendingClientActionId).not.toBeNull();
        expect(state.lastEngineStateHash).not.toBeNull();
        expect(state.engineActionLog).toHaveLength(1);
        expect(state.engineNetResyncing).toBe(false);
    });

    it('Ack path: ENGINE_ACTION with matching clientActionId and matching hash does NOT reapply', () => {
        const battle = createMockBattle();
        const rng = createRng(12345);
        useBattleStore.setState({ battle, rng });
        useMultiplayerStore.setState({ multiplayerRole: 'guest' });

        // 1. Dispatch optimistic
        useBattleStore.getState().actions.dispatchEngineAction({ type: 'ROLL_INITIATIVE' });
        const stateAfterOptimistic = useBattleStore.getState();
        const pendingId = stateAfterOptimistic.engineNetPendingClientActionId!;
        const predictedHash = stateAfterOptimistic.lastEngineStateHash!;

        // 2. Receive ACK (Engine Action with same ID and Hash)
        useBattleStore.getState().actions.handleEngineActionFromNetwork({
            action: { type: 'ROLL_INITIATIVE' },
            resultingHash: predictedHash,
            clientActionId: pendingId,
            battleId: battle.id,
            seq: 1
        });

        const finalState = useBattleStore.getState();
        
        // Expect pending cleared
        expect(finalState.engineNetPendingClientActionId).toBeNull();
        // Expect NO double application (log still 1)
        expect(finalState.engineActionLog).toHaveLength(1);
        // Expect hash unchanged
        expect(finalState.lastEngineStateHash).toBe(predictedHash);
    });

    it('Reject path sets resyncing and clears pending', () => {
        const battle = createMockBattle();
        const rng = createRng(12345);
        useBattleStore.setState({ battle, rng });
        useMultiplayerStore.setState({ multiplayerRole: 'guest' });

        // 1. Dispatch optimistic
        useBattleStore.getState().actions.dispatchEngineAction({ type: 'ROLL_INITIATIVE' });
        const stateAfterOptimistic = useBattleStore.getState();
        const pendingId = stateAfterOptimistic.engineNetPendingClientActionId!;

        // 2. Receive Reject
        useBattleStore.getState().actions.handleEngineActionRejectFromNetwork({
            clientActionId: pendingId,
            reason: 'invalid_action'
        });

        const finalState = useBattleStore.getState();
        
        expect(finalState.engineNetPendingClientActionId).toBeNull();
        expect(finalState.engineNetResyncing).toBe(true);
    });

    it('One in-flight guard: prevent second action while pending', () => {
        const battle = createMockBattle();
        const rng = createRng(12345);
        useBattleStore.setState({ battle, rng });
        useMultiplayerStore.setState({ multiplayerRole: 'guest' });
        
        // 1. First action
        useBattleStore.getState().actions.dispatchEngineAction({ type: 'ROLL_INITIATIVE' });
        expect(multiplayerService.send).toHaveBeenCalledTimes(1);

        // 2. Second action (should be blocked)
        useBattleStore.getState().actions.dispatchEngineAction({ type: 'ADVANCE_PHASE' });
        
        // Still 1 call
        expect(multiplayerService.send).toHaveBeenCalledTimes(1);
        
        const state = useBattleStore.getState();
        expect(state.engineActionLog).toHaveLength(1); // Only first action applied
    });

    it('Guest dispatchEngineAction catches errors and sets resync', () => {
        const battle = createMockBattle();
        const rng = createRng(12345);
        useBattleStore.setState({ battle, rng });
        useMultiplayerStore.setState({ multiplayerRole: 'guest' });

        // Mock reduceBattle to throw
        (reduceBattle as any).mockImplementationOnce(() => {
            throw new Error('Simulated optimistic crash');
        });

        useBattleStore.getState().actions.dispatchEngineAction({ type: 'ROLL_INITIATIVE' });

        const state = useBattleStore.getState();
        
        // Should NOT have sent propose
        expect(multiplayerService.send).not.toHaveBeenCalled();
        
        // Should be in resync mode
        expect(state.engineNetResyncing).toBe(true);
        
        // Should not have applied state or pending action
        expect(state.engineNetPendingClientActionId).toBeNull();
        expect(state.engineActionLog).toHaveLength(0);
    });
});

describe('Stage 6C: Engine V2 Ordered Delivery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useBattleStore.setState({
            battle: null,
            rng: null,
            engineV2Enabled: true,
            lastEngineStateHash: null,
            engineActionLog: [],
            engineBaseline: null,
            events: [],
            engineLog: [],
            engineNetResyncing: false,
            engineNetClientActionSeq: 0,
            engineNetPendingClientActionId: null,
            engineNetPendingPredictedHash: null,
            engineNetHostSeq: 0,
            engineNetRemoteSeq: 0,
            engineNetExpectedSeq: 1,
            engineNetActionBuffer: {},
        });
        useMultiplayerStore.setState({ multiplayerRole: null });
    });

    it('buffers out-of-order actions and drains them when missing link arrives', () => {
        const battle = createMockBattle();
        const rng = createRng(12345);
        useBattleStore.setState({ battle, rng, engineBaseline: { schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, battle, rng } });
        useMultiplayerStore.setState({ multiplayerRole: 'guest' });

        // Mocks for results
        const result1 = {
             next: { battle: { ...battle, phase: 'quick_actions' }, rng: { ...rng, cursor: 1 } },
             stateHash: 'hash-1',
             events: [],
             log: []
        };
        const result2 = {
             next: { battle: { ...battle, phase: 'quick_actions', activeParticipantId: 'p1' }, rng: { ...rng, cursor: 2 } },
             stateHash: 'hash-2',
             events: [],
             log: []
        };

        // Mock implementation to return these results
        (reduceBattle as any).mockImplementation((state: any, action: any) => {
             if (action.type === 'ROLL_INITIATIVE') return result1;
             if (action.type === 'ADVANCE_PHASE') return result2;
             return result1;
        });

        const action1: BattleAction = { type: 'ROLL_INITIATIVE' };
        const action2: BattleAction = { type: 'ADVANCE_PHASE' };

        // 1. Send Seq 2 (Future)
        useBattleStore.getState().actions.handleEngineActionFromNetwork({
            action: action2,
            resultingHash: 'hash-2',
            seq: 2,
            battleId: battle.id
        });

        let state = useBattleStore.getState();
        // Should be buffered
        expect(state.engineNetActionBuffer[2]).toBeDefined();
        expect(state.engineNetExpectedSeq).toBe(1);
        expect(state.engineActionLog).toHaveLength(0);

        // 2. Send Seq 1 (Now)
        useBattleStore.getState().actions.handleEngineActionFromNetwork({
            action: action1,
            resultingHash: 'hash-1',
            seq: 1,
            battleId: battle.id
        });

        state = useBattleStore.getState();
        // Should have applied 1 and drained 2
        expect(state.engineActionLog).toHaveLength(2);
        expect(state.engineActionLog[0]).toEqual(action1);
        expect(state.engineActionLog[1]).toEqual(action2);
        expect(state.engineNetExpectedSeq).toBe(3);
        expect(state.engineNetRemoteSeq).toBe(2);
        expect(state.engineNetActionBuffer).toEqual({});
        expect(state.engineNetResyncing).toBe(false);
    });

    it('ignores duplicate actions (seq < expected)', () => {
        const battle = createMockBattle();
        const rng = createRng(12345);
        useBattleStore.setState({ battle, rng, engineBaseline: { schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, battle, rng } });
        useMultiplayerStore.setState({ multiplayerRole: 'guest' });

        const action: BattleAction = { type: 'ROLL_INITIATIVE' };
        const engineState = { schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, battle, rng };
        const result = (reduceBattle as any).getMockImplementation()(engineState, action, { rng: { d6, d100 } });

        // Apply Seq 1
        useBattleStore.getState().actions.handleEngineActionFromNetwork({
            action,
            resultingHash: result.stateHash,
            seq: 1,
            battleId: battle.id
        });

        let state = useBattleStore.getState();
        expect(state.engineNetExpectedSeq).toBe(2);
        expect(state.engineActionLog).toHaveLength(1);

        // Apply Seq 1 AGAIN
        const res = useBattleStore.getState().actions.handleEngineActionFromNetwork({
            action,
            resultingHash: result.stateHash,
            seq: 1,
            battleId: battle.id
        });

        expect(res.ok).toBe(true);
        expect(res.mode).toBe('dup_ignored');

        state = useBattleStore.getState();
        expect(state.engineNetExpectedSeq).toBe(2);
        expect(state.engineActionLog).toHaveLength(1);
        expect(state.engineNetResyncing).toBe(false);
    });

    it('out-of-order ACK triggers resync', () => {
        const battle = createMockBattle();
        const rng = createRng(12345);
        useBattleStore.setState({ battle, rng, engineBaseline: { schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, battle, rng } });
        useMultiplayerStore.setState({ multiplayerRole: 'guest' });

        // 1. Optimistic Dispatch
        useBattleStore.getState().actions.dispatchEngineAction({ type: 'ROLL_INITIATIVE' });
        
        let state = useBattleStore.getState();
        const pendingId = state.engineNetPendingClientActionId;
        const predictedHash = state.lastEngineStateHash;
        
        expect(state.engineNetExpectedSeq).toBe(1);

        // 2. Receive ACK but with Seq 2 (skipping 1)
        const res = useBattleStore.getState().actions.handleEngineActionFromNetwork({
            action: { type: 'ROLL_INITIATIVE' },
            resultingHash: predictedHash!,
            seq: 2,
            clientActionId: pendingId!,
            battleId: battle.id
        });

        expect(res.ok).toBe(false);
        expect(res.reason).toBe('out_of_order_ack');

        state = useBattleStore.getState();
        expect(state.engineNetResyncing).toBe(true);
        expect(state.engineNetPendingClientActionId).toBeNull();
        expect(state.engineNetActionBuffer).toEqual({});
    });
});
