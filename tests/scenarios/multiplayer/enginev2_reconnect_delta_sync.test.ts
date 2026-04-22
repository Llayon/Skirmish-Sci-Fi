import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBattleStore } from '@/stores/battleStore';
import { useMultiplayerStore } from '@/stores/multiplayerStore';
import { multiplayerService } from '@/services/multiplayerService';
import { EngineBattleState, BattleAction } from '@/services/engine/battle/types';
import { Battle, Mission } from '@/types';

// Mock network
vi.mock('@/services/multiplayerService', () => ({
    multiplayerService: {
        send: vi.fn(),
        onData: vi.fn(() => vi.fn()),
        onSyncRequest: vi.fn(() => vi.fn()),
        onReconnecting: vi.fn(() => vi.fn()),
        onConnect: vi.fn(() => vi.fn()),
        onDisconnect: vi.fn(() => vi.fn()),
        onPeerError: vi.fn(() => vi.fn()),
    }
}));

describe('Multiplayer: Reconnect Delta Sync (Stage 6E)', () => {
    beforeEach(() => {
        useBattleStore.getState().actions.resetEngineTracking();
        vi.clearAllMocks();
    });

    const createDummyState = (id: string): EngineBattleState => ({
        schemaVersion: 1,
        battle: {
            id,
            participants: [],
            terrain: [],
            gridSize: { width: 10, height: 10 },
            round: 1,
            phase: 'quick_actions',
            quickActionOrder: [],
            slowActionOrder: [],
            enemyTurnOrder: [],
            reactionRolls: {},
            reactionRerollsUsed: false,
            currentTurnIndex: 0,
            activeParticipantId: null,
            log: [],
            mission: {
                type: 'Eliminate',
                titleKey: 'test',
                descriptionKey: 'test',
                status: 'active'
            } as Mission
        } as unknown as Battle,
        rng: { seed: 123, cursor: 0 }
    });

    it('Scenario 1: Host provides delta sync for a guest that is slightly behind', () => {
        // 1. Setup Host
        useMultiplayerStore.setState({ multiplayerRole: 'host' });
        const battleId = 'sync-test-1';
        const baseline = createDummyState(battleId);
        
        useBattleStore.setState({
            engineV2Enabled: true,
            engineBaseline: baseline,
            engineBaselineHash: 'base-hash',
            battle: baseline.battle,
            rng: baseline.rng
        });

        const store = useBattleStore.getState();

        // Apply 3 setup actions on Host
        const action: BattleAction = { type: 'MISSION_SETUP' };
        store.actions.dispatchEngineAction(action); // Seq 1
        store.actions.dispatchEngineAction(action); // Seq 2
        store.actions.dispatchEngineAction(action); // Seq 3

        expect(useBattleStore.getState().engineNetHostSeq).toBe(3);
        expect(useBattleStore.getState().engineActionLog).toHaveLength(3);

        // 2. Simulate Sync Request from Guest (who only has Seq 1)
        store.actions.handleEngineSyncRequestFromNetwork({
            battleId,
            lastReceivedSeq: 1
        });

        // 3. Verify Host sent ENGINE_SYNC_RESPONSE with actions Seq 2 and 3
        expect(multiplayerService.send).toHaveBeenCalledWith(expect.objectContaining({
            type: 'ENGINE_SYNC_RESPONSE',
            payload: expect.objectContaining({
                battleId,
                startSeq: 2,
                actions: expect.arrayContaining([
                    expect.objectContaining({ seq: 2 }),
                    expect.objectContaining({ seq: 3 })
                ])
            })
        }));
    });

    it('Scenario 2: Host forces full snapshot if guest is too far behind', () => {
        useMultiplayerStore.setState({ multiplayerRole: 'host' });
        const battleId = 'sync-test-2';
        const baseline = createDummyState(battleId);

        useBattleStore.setState({
            engineV2Enabled: true,
            battle: baseline.battle,
            rng: baseline.rng,
            engineBaseline: baseline,
            engineNetHostSeq: 300 
        });

        const store = useBattleStore.getState();
        store.actions.handleEngineSyncRequestFromNetwork({
            battleId,
            lastReceivedSeq: 1
        });

        expect(multiplayerService.send).toHaveBeenCalledWith(expect.objectContaining({
            type: 'ENGINE_SYNC_RESPONSE',
            payload: expect.objectContaining({
                snapshot: expect.any(Object)
            })
        }));
    });

    it('Scenario 3: Guest successfully applies delta sync', () => {
        useMultiplayerStore.setState({ multiplayerRole: 'guest' });
        const battleId = 'sync-test-3';
        const baseline = createDummyState(battleId);
        
        useBattleStore.setState({
            engineV2Enabled: true,
            battle: baseline.battle,
            rng: baseline.rng,
            engineBaseline: baseline,
            engineNetExpectedSeq: 1 
        });

        const store = useBattleStore.getState();
        const action: BattleAction = { type: 'MISSION_SETUP' };
        
        store.actions.handleEngineSyncResponseFromNetwork({
            battleId,
            startSeq: 1,
            actions: [
                { seq: 1, action, resultingHash: 'ignore-in-this-test' } 
            ]
        });

        expect(useBattleStore.getState().engineNetResyncing).toBe(true); 
    });
});
