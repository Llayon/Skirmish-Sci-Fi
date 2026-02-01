
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMinimalBattle, createTestCharacter } from '../../fixtures/battleFixtures';
import { createRng, d6, d100 } from '@/services/engine/rng/rng';
import { hashEngineBattleState } from '@/services/engine/battle/hashEngineBattleState';
import { replayBattle } from '@/services/engine/battle/replayBattle';
import { CURRENT_ENGINE_SCHEMA_VERSION } from '@/services/engine/battle/types';
import type { BattleAction, EngineBattleState } from '@/services/engine/battle/types';

type EngineSyncResponsePayload = {
  battleId: string;
  startSeq: number;
  actions: Array<{ seq: number; action: BattleAction; resultingHash: string }>;
  snapshot?: { seq: number; snapshot: EngineBattleState; hash: string };
};

type MultiplayerOutboundMessage =
  | { type: 'ENGINE_SYNC_RESPONSE'; payload: EngineSyncResponsePayload }
  | { type: string; payload: unknown };

// Mock multiplayer service globally first, but we will refine it per test
vi.mock('@/services/multiplayerService', () => ({
  multiplayerService: {
    send: vi.fn<(message: MultiplayerOutboundMessage) => void>(),
  },
}));

// Mock other stores to avoid side effects during imports
vi.mock('@/stores/crewStore', () => ({
  useCrewStore: { getState: () => ({ crew: null }) },
}));
vi.mock('@/stores/campaignProgressStore', () => ({
  useCampaignProgressStore: { getState: () => ({ campaign: null }) },
}));
vi.mock('@/stores/shipStore', () => ({
  useShipStore: { getState: () => ({ ship: null, stash: null }) },
}));
vi.mock('@/stores/uiStore', () => ({
  useUiStore: { getState: () => ({ actions: { setGameMode: vi.fn() } }) },
}));

describe('Engine V2 Multiplayer Reconnect Delta Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1) Host sends correct ENGINE_SYNC_RESPONSE (Delta)', async () => {
    // 1. Setup Host Store
    let currentRole: 'host' | 'guest' | null = 'host';
    
    vi.doMock('@/stores/multiplayerStore', () => ({
      useMultiplayerStore: {
        getState: () => ({ 
          multiplayerRole: currentRole, 
          actions: { abortMultiplayer: vi.fn() } 
        }),
      },
    }));

    const { useBattleStore } = await import('@/stores/battleStore');
    const { multiplayerService } = await import('@/services/multiplayerService');

    // 2. Initialize Battle
    const battle = createMinimalBattle({
      participants: [createTestCharacter({ id: 'c1', position: { x: 1, y: 1 } })],
    });
    const rng = createRng(12345);

    useBattleStore.getState().actions.setEngineV2Enabled(true);
    useBattleStore.getState().actions.setNewBattle(battle);
    useBattleStore.setState(state => { state.rng = rng; }); // Direct set to ensure seed
    
    // Capture baseline
    useBattleStore.getState().actions.captureEngineBaseline();
    const baseline = useBattleStore.getState().engineBaseline;
    expect(baseline).toBeDefined();

    // 3. Apply Actions (3 actions)
    // Use simple moves to stay in quick_actions phase and avoid complexity
    const actions: BattleAction[] = [
      { type: 'MOVE_PARTICIPANT', participantId: 'c1', to: { x: 2, y: 1 } },
      { type: 'MOVE_PARTICIPANT', participantId: 'c1', to: { x: 2, y: 2 } },
      { type: 'MOVE_PARTICIPANT', participantId: 'c1', to: { x: 1, y: 2 } }
    ];

    actions.forEach(action => {
      useBattleStore.getState().actions.dispatchEngineAction(action);
    });

    const hostState = useBattleStore.getState();
    expect(hostState.engineNetHostSeq).toBe(3);
    expect(hostState.engineActionLog).toHaveLength(3);

    // Clear previous calls (ENGINE_ACTION broadcasts)
    vi.mocked(multiplayerService.send).mockClear();

    // 4. Simulate Sync Request (Guest asks for history from seq 1, meaning they have seq 1, need 2, 3)
    // "lastReceivedSeq: 1" means guest has action #1. Host should send #2 and #3.
    // Host seq is 3. Diff = 3 - 1 = 2 actions.
    const lastReceivedSeq = 1;
    useBattleStore.getState().actions.handleEngineSyncRequestFromNetwork({
      battleId: battle.id,
      lastReceivedSeq: lastReceivedSeq,
    });

    // 5. Verify Response
    const sendMock = vi.mocked(multiplayerService.send);
    expect(sendMock).toHaveBeenCalledTimes(1);

    const msg = sendMock.mock.calls[0][0];
    expect(msg.type).toBe('ENGINE_SYNC_RESPONSE');
    if (msg.type !== 'ENGINE_SYNC_RESPONSE') throw new Error('Expected ENGINE_SYNC_RESPONSE');
    const payload = msg.payload;

    expect(payload.actions).toHaveLength(2);
    expect(payload.snapshot).toBeUndefined();

    // Verify actions content and hashes
    // Replay locally to verify truth
    const expectedReplay = replayBattle(baseline!, actions, { rng: { d6, d100 } });
    
    // Action 2 (seq 2) -> index 1 in log/steps
    expect(payload.actions[0].seq).toBe(2);
    expect(payload.actions[0].action).toEqual(actions[1]);
    expect(payload.actions[0].resultingHash).toBe(expectedReplay.steps[1].stateHash);

    // Action 3 (seq 3) -> index 2 in log/steps
    expect(payload.actions[1].seq).toBe(3);
    expect(payload.actions[1].action).toEqual(actions[2]);
    expect(payload.actions[1].resultingHash).toBe(expectedReplay.steps[2].stateHash);
  });

  it('2) Host Snapshot fallback if delta is impossible', async () => {
    let currentRole: 'host' | 'guest' | null = 'host';
    vi.doMock('@/stores/multiplayerStore', () => ({
      useMultiplayerStore: {
        getState: () => ({ multiplayerRole: currentRole, actions: { abortMultiplayer: vi.fn() } }),
      },
    }));

    const { useBattleStore } = await import('@/stores/battleStore');
    const { multiplayerService } = await import('@/services/multiplayerService');

    const battle = createMinimalBattle({
        participants: [createTestCharacter({ id: 'c1', position: { x: 1, y: 1 } })],
    });
    const rng = createRng(12345);

    useBattleStore.getState().actions.setEngineV2Enabled(true);
    useBattleStore.getState().actions.setNewBattle(battle);
    useBattleStore.setState(state => { state.rng = rng; });
    useBattleStore.getState().actions.captureEngineBaseline();

    // Add some actions
    useBattleStore.getState().actions.dispatchEngineAction({ type: 'ADVANCE_PHASE' });
    
    // Clear previous calls
    vi.mocked(multiplayerService.send).mockClear();

    // Scenario: Guest is too far behind (e.g. diff > 200)
    // Host seq is 300. Guest says lastReceivedSeq = 0.
    
    useBattleStore.setState(state => {
        state.engineNetHostSeq = 300; 
        state.engineActionLog = []; // Missing log, but diff > 200 should trigger snapshot anyway
    });

    useBattleStore.getState().actions.handleEngineSyncRequestFromNetwork({
        battleId: battle.id,
        lastReceivedSeq: 0,
    });

    expect(multiplayerService.send).toHaveBeenCalledTimes(1);
    
    const sendMock = vi.mocked(multiplayerService.send);
    const msg = sendMock.mock.calls[0][0];
    expect(msg.type).toBe('ENGINE_SYNC_RESPONSE');
    if (msg.type !== 'ENGINE_SYNC_RESPONSE') throw new Error('Expected ENGINE_SYNC_RESPONSE');
    expect(msg.payload.actions).toEqual([]);
    expect(msg.payload.snapshot).toBeDefined();
    expect(msg.payload.snapshot?.hash).toBe(useBattleStore.getState().lastEngineStateHash);
  });

  it('3) Guest applies Delta and validates hash chain', async () => {
    // --- HOST SETUP (to generate valid data) ---
    // We need to run host first to get valid hashes
    vi.resetModules();
    let role: 'host' | 'guest' | null = 'host';
    vi.doMock('@/stores/multiplayerStore', () => ({
        useMultiplayerStore: { getState: () => ({ multiplayerRole: role, actions: { abortMultiplayer: vi.fn() } }) },
    }));
    
    const HostModule = await import('@/stores/battleStore');
    const hostStore = HostModule.useBattleStore;
    
    const battle = createMinimalBattle({ participants: [createTestCharacter({ id: 'c1', position: { x: 1, y: 1 } })] });
    const rng = createRng(12345);
    
    hostStore.getState().actions.setEngineV2Enabled(true);
    hostStore.getState().actions.setNewBattle(battle);
    hostStore.setState(s => { s.rng = rng; });
    hostStore.getState().actions.captureEngineBaseline();
    
    // Actions
    const action1: BattleAction = { type: 'ADVANCE_PHASE' };
    const action2: BattleAction = { type: 'END_TURN', participantId: 'c1' };
    
    hostStore.getState().actions.dispatchEngineAction(action1);
    const hash1 = hostStore.getState().lastEngineStateHash!;
    
    hostStore.getState().actions.dispatchEngineAction(action2);
    const hash2 = hostStore.getState().lastEngineStateHash!;

    const baselineState = hostStore.getState().engineBaseline!;
    const baselineHash = hostStore.getState().engineBaselineHash!;
    const baselineSnapshot: EngineBattleState = {
      schemaVersion: baselineState.schemaVersion,
      battle: structuredClone(baselineState.battle),
      rng: structuredClone(baselineState.rng),
    };

    // --- GUEST SETUP ---
    vi.resetModules(); // New isolation
    role = 'guest';
    vi.doMock('@/stores/multiplayerStore', () => ({
        useMultiplayerStore: { getState: () => ({ multiplayerRole: role, actions: { abortMultiplayer: vi.fn() } }) },
    }));
    
    // We need to re-mock the service for the guest module
    vi.doMock('@/services/multiplayerService', () => ({
        multiplayerService: { send: vi.fn() },
    }));

    const GuestModule = await import('@/stores/battleStore');
    const guestStore = GuestModule.useBattleStore;
    
    // Init guest with empty/null
    guestStore.getState().actions.setEngineV2Enabled(true);
    guestStore.getState().actions.setNewBattle(battle); // Just to have ID matching
    
    // 1. Apply Baseline Snapshot (simulating full sync at start or recovery)
    guestStore.getState().actions.handleEngineSyncResponseFromNetwork({
        battleId: battle.id,
        startSeq: 0,
        actions: [],
        snapshot: {
            seq: 0,
            snapshot: baselineSnapshot,
            hash: baselineHash
        }
    });

    expect(guestStore.getState().engineNetRemoteSeq).toBe(0);
    expect(guestStore.getState().engineNetExpectedSeq).toBe(1);
    expect(guestStore.getState().lastEngineStateHash).toBe(baselineHash);

    // 2. Apply Delta (Actions 1 & 2)
    guestStore.getState().actions.handleEngineSyncResponseFromNetwork({
        battleId: battle.id,
        startSeq: 1,
        actions: [
            { seq: 1, action: action1, resultingHash: hash1 },
            { seq: 2, action: action2, resultingHash: hash2 }
        ]
    });

    // Verify Guest State
    expect(guestStore.getState().engineNetResyncing).toBe(false);
    expect(guestStore.getState().lastEngineStateHash).toBe(hash2);
    expect(guestStore.getState().engineNetExpectedSeq).toBe(3); // Expecting next one
    expect(guestStore.getState().engineActionLog).toHaveLength(2);
  });

  it('4) Guest hash mismatch -> resync', async () => {
     // Reuse logic from test 3 but inject error
     vi.resetModules();
     let role: 'host' | 'guest' | null = 'guest';
     vi.doMock('@/stores/multiplayerStore', () => ({
         useMultiplayerStore: { getState: () => ({ multiplayerRole: role, actions: { abortMultiplayer: vi.fn() } }) },
     }));
     vi.doMock('@/services/multiplayerService', () => ({
        multiplayerService: { send: vi.fn() },
     }));
 
     const GuestModule = await import('@/stores/battleStore');
     const guestStore = GuestModule.useBattleStore;
     
     const battle = createMinimalBattle({ participants: [createTestCharacter({ id: 'c1', position: { x: 1, y: 1 } })] });
     const rng = createRng(12345);
     
     guestStore.getState().actions.setEngineV2Enabled(true);
     guestStore.getState().actions.setNewBattle(battle);
     
     // 1. Initial Snapshot (use valid baseline hash to avoid warnings and keep state consistent)
     const baselineState: EngineBattleState = { schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION, battle, rng };
     const baselineHash = hashEngineBattleState(baselineState);
     guestStore.getState().actions.handleEngineSyncResponseFromNetwork({
         battleId: battle.id,
         startSeq: 0,
         actions: [],
         snapshot: {
             seq: 0,
             snapshot: baselineState,
             hash: baselineHash
         }
     });
     
     // 2. Apply Delta with WRONG hash
     const action1: BattleAction = { type: 'ADVANCE_PHASE' };
     
     guestStore.getState().actions.handleEngineSyncResponseFromNetwork({
         battleId: battle.id,
         startSeq: 1,
         actions: [
             { seq: 1, action: action1, resultingHash: 'WRONG_HASH' }
         ]
     });

     // Expect Resync Trigger
     expect(guestStore.getState().engineNetResyncing).toBe(true);
     // Should NOT have applied the action fully (or at least marked as resync)
     // Our implementation breaks loop on mismatch.
     expect(guestStore.getState().engineActionLog).toHaveLength(0);
  });
});
