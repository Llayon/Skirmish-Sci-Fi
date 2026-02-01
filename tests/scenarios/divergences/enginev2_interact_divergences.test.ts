import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMinimalBattle, createTestCharacter } from '../../fixtures/battleFixtures';
import { createBattleSignature } from '../../helpers/battleSignature';
import { reduceBattle } from '@/services/engine/battle/reduceBattle';
import { CURRENT_ENGINE_SCHEMA_VERSION } from '@/services/engine/battle/types';
import { createScriptedRngState, d6, d100 } from '@/services/engine/rng/rng';
import { mockRng } from '../../helpers/mockRng';
import { rollD6 } from '@/services/utils/rolls';
import { coreResolverMiddleware } from '@/services/application/middleware/coreResolverMiddleware';
import { Battle, PlayerAction, LogEntry, Terrain } from '@/types';
import type { MiddlewareContext } from '@/services/application/middleware/types';

vi.mock('@/services/utils/rolls', () => ({
    rollD6: vi.fn(() => mockRng.d6()),
    rollD100: vi.fn(() => mockRng.d100()),
}));

const makeTerrain = (overrides: Partial<Terrain> & Pick<Terrain, 'id' | 'type' | 'position'>): Terrain => ({
    id: overrides.id,
    type: overrides.type,
    position: overrides.position,
    name: overrides.name ?? 'Terrain',
    size: overrides.size ?? { width: 1, height: 1 },
    providesCover: overrides.providesCover ?? false,
    isDifficult: overrides.isDifficult ?? false,
    blocksLineOfSight: overrides.blocksLineOfSight ?? false,
    isImpassable: overrides.isImpassable ?? false,
});

const runMiddleware = (battle: Battle, action: PlayerAction) => {
    const logEntries: LogEntry[] = [];
    const context: MiddlewareContext = {
        battle,
        action,
        multiplayerRole: null,
        logEntries,
        success: true
    };
    const next = vi.fn();
    coreResolverMiddleware(context, next);
    return { logEntries, next };
};

describe('Divergences: Interact Objective', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRng.reset();
    });

    it('Scenario: Deliver Mission - Status Success (Known Divergence)', () => {
        // 1. Setup
        const participantId = 'c1';
        const objectivePos = { x: 5, y: 5 };
        const character = createTestCharacter({
            id: participantId,
            name: 'Courier',
            position: { x: 5, y: 5 }, // On objective
        });

        const baselineBattle = createMinimalBattle({
            participants: [character],
            missionType: 'Deliver'
        });
        
        // Setup delivery state: Holding item, at objective
        baselineBattle.mission.objectivePosition = objectivePos;
        baselineBattle.mission.itemCarrierId = participantId;
        baselineBattle.mission.packageDelivered = false;
        baselineBattle.mission.itemPosition = null;

        const battleV1 = structuredClone(baselineBattle);
        const battleV2 = structuredClone(baselineBattle);

        // 2. V1 Execution
        const actionV1 = { 
            type: 'interact' as const, 
            payload: { characterId: participantId, objectiveId: 'main' } 
        };

        runMiddleware(battleV1, actionV1);

        // V1 Assertions: Delivered but status not updated
        expect(battleV1.mission.packageDelivered).toBe(true);
        expect(battleV1.mission.status).toBe('in_progress'); // Divergence here
        expect(battleV1.mission.itemCarrierId).toBeNull();

        // 3. V2 Replay
        const engineState = {
            schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
            battle: battleV2,
            rng: createScriptedRngState([])
        };

        const actionV2 = {
            type: 'INTERACT_OBJECTIVE' as const,
            participantId,
            objectiveId: 'main'
        };

        const result = reduceBattle(engineState, actionV2, { rng: { d6, d100 } });

        // 4. V2 Assertions: Delivered AND Success
        expect(result.next.battle.mission.packageDelivered).toBe(true);
        expect(result.next.battle.mission.status).toBe('success'); // Improvement
        expect(result.next.battle.mission.itemCarrierId).toBeNull();
        expect(result.events.some(e => e.type === 'OBJECTIVE_INTERACT_DECLARED')).toBe(true);
        expect(result.events.some(e => e.type === 'OBJECTIVE_INTERACT_RESOLVED' && e.success === true)).toBe(true);

        // 5. Parity Checks (for the rest)
        // We manually verify that other fields match
        expect(result.next.battle.participants[0].actionsRemaining).toBe(
            battleV1.participants[0].actionsRemaining
        );
        expect(result.next.battle.mission.itemCarrierId).toBe(
            battleV1.mission.itemCarrierId
        );
    });

    it('Scenario: Access Mission - Out of Range (Known Divergence)', () => {
        // 1. Setup
        const participantId = 'c1';
        const objectivePos = { x: 0, y: 0 };
        const character = createTestCharacter({
            id: participantId,
            name: 'Hacker',
            position: { x: 0, y: 1 }, // Dist 1 => out_of_range (maxDist=0)
            stats: { savvy: 1 }
        });

        const baselineBattle = createMinimalBattle({
            participants: [character],
            missionType: 'Access'
        });
        
        // Setup objective
        baselineBattle.mission.objectivePosition = objectivePos;

        const battleV1 = structuredClone(baselineBattle);
        const battleV2 = structuredClone(baselineBattle);

        const actionV1 = { 
            type: 'interact' as const, 
            payload: { characterId: participantId, objectiveId: 'main' } 
        };

        // V1 Divergence Note:
        // V1 middleware lacks a distance check for 'Access' mission type.
        // It WILL roll despite being out of range.
        // V2 enforces strict distance checking (maxDist=0).
        // This test documents the divergence and ensures V2 behaves correctly (strictly).
        
        mockRng.queueD6(1); // Queue a roll for V1 to consume (Fail roll)
        
        expect(() => runMiddleware(battleV1, actionV1)).not.toThrow();
        // We verify V1 DID consume the roll (divergence)
        expect(vi.mocked(rollD6)).toHaveBeenCalledTimes(1);
        mockRng.assertEmpty();
        
        // 3. V2 Replay
        const engineState = {
            schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
            battle: battleV2,
            rng: createScriptedRngState([]) // Empty script
        };

        const actionV2 = {
            type: 'INTERACT_OBJECTIVE' as const,
            participantId,
            objectiveId: 'main'
        };

        const result = reduceBattle(engineState, actionV2, { rng: { d6, d100 } });

        // 4. Parity/Correctness Assertions
        expect(result.next.rng.cursor).toBe(0);

        // V2 should be No-Op (except for events/log)
        // Verify state is unchanged
        const sigV2 = createBattleSignature(result.next.battle);
        const sigBaseline = createBattleSignature(baselineBattle);
        
        sigV2.log = [];
        sigBaseline.log = [];
        expect(sigV2).toEqual(sigBaseline);

        // Verify specifically that AP was NOT consumed
        expect(result.next.battle.participants[0].actionsRemaining).toBe(
            battleV2.participants[0].actionsRemaining
        );

        // 5. Event Correctness
        const resolvedEvent = result.events.find(e => e.type === 'OBJECTIVE_INTERACT_RESOLVED');
        expect(resolvedEvent).toBeDefined();
        expect(resolvedEvent).toMatchObject({
            type: 'OBJECTIVE_INTERACT_RESOLVED',
            participantId,
            objectiveId: 'main',
            success: false,
            reason: 'out_of_range'
        });
        
        if (resolvedEvent && 'roll' in resolvedEvent) {
             expect(resolvedEvent.roll).toBeUndefined();
        }
    });

    it('Scenario: Access Mission - Invalid Objective (Known Divergence)', () => {
        // 1. Setup
        const participantId = 'c1';
        const character = createTestCharacter({
            id: participantId,
            name: 'Hacker',
            position: { x: 0, y: 0 },
            stats: { savvy: 1 }
        });

        const baselineBattle = createMinimalBattle({
            participants: [character],
            missionType: 'Access'
        });
        
        // Remove objective position to simulate invalid/missing objective
        baselineBattle.mission.objectivePosition = undefined;

        const battleV1 = structuredClone(baselineBattle);
        const battleV2 = structuredClone(baselineBattle);

        // 2. V1 Execution
        const actionV1 = { 
            type: 'interact' as const, 
            payload: { characterId: participantId, objectiveId: 'main' } 
        };

        // V1 Divergence:
        // V1 proceeds to consume AP even if objective is missing (likely due to missing guard in middleware).
        // V2 validates objective existence and returns early with reason:'invalid_objective' and NO state change.
        
        expect(() => runMiddleware(battleV1, actionV1)).not.toThrow();
        // V1 likely didn't roll (no crash with empty queue), but it DID consume AP (as seen in previous failure).
        // We confirm this divergence.
        expect(battleV1.participants[0].actionsRemaining).toBe(baselineBattle.participants[0].actionsRemaining - 1);
        // Explicitly confirm V1 did NOT roll (it just consumed AP without logic)
        expect(vi.mocked(rollD6)).not.toHaveBeenCalled();
        mockRng.assertEmpty();
        
        // 3. V2 Replay
        const engineState = {
            schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
            battle: battleV2,
            rng: createScriptedRngState([]) // Empty script
        };

        const actionV2 = {
            type: 'INTERACT_OBJECTIVE' as const,
            participantId,
            objectiveId: 'main'
        };

        const result = reduceBattle(engineState, actionV2, { rng: { d6, d100 } });

        // 4. Parity/Correctness Assertions
        expect(result.next.rng.cursor).toBe(0);

        // Verify specifically that AP was NOT consumed in V2
        expect(result.next.battle.participants[0].actionsRemaining).toBe(
            battleV2.participants[0].actionsRemaining
        );

        // Verify full state no-op (except logs if any, though invalid shouldn't log much)
        const sigV2 = createBattleSignature(result.next.battle);
        const sigBaseline = createBattleSignature(battleV2);
        sigV2.log = [];
        sigBaseline.log = [];
        expect(sigV2).toEqual(sigBaseline);

        // 5. Event Correctness
        const resolvedEvent = result.events.find(e => e.type === 'OBJECTIVE_INTERACT_RESOLVED');
        expect(resolvedEvent).toBeDefined();
        expect(resolvedEvent).toMatchObject({
            type: 'OBJECTIVE_INTERACT_RESOLVED',
            participantId,
            objectiveId: 'main',
            success: false,
            reason: 'invalid_objective'
        });

        if (resolvedEvent && 'roll' in resolvedEvent) {
             expect(resolvedEvent.roll).toBeUndefined();
        }
    });

    it('Scenario: Search Mission - Already Searched (Known Divergence)', () => {
        // 1. Setup
        const participantId = 'c1';
        const character = createTestCharacter({
            id: participantId,
            name: 'Rookie',
            position: { x: 5, y: 5 }, // On objective
            stats: { savvy: 1 }
        });

        const baselineBattle = createMinimalBattle({
            participants: [character],
            missionType: 'Search'
        });
        
        baselineBattle.mission.objectivePosition = { x: 5, y: 5 };
        baselineBattle.mission.searchRadius = 1;
        baselineBattle.mission.searchedPositions = [{ x: 5, y: 5 }]; // ALREADY SEARCHED

        const battleV1 = structuredClone(baselineBattle);
        const battleV2 = structuredClone(baselineBattle);

        // 2. V1 Execution
        const actionV1 = { 
            type: 'interact' as const, 
            payload: { characterId: participantId, objectiveId: 'main' } 
        };

        runMiddleware(battleV1, actionV1);

        // V1 Behavior: No roll, no duplicate added, BUT consumes AP (Exploratory finding)
        expect(vi.mocked(rollD6)).not.toHaveBeenCalled();
        mockRng.assertEmpty();
        expect(battleV1.mission.searchedPositions).toHaveLength(1);
        expect(battleV1.participants[0].actionsRemaining).toBe(baselineBattle.participants[0].actionsRemaining - 1);

        // 3. V2 Replay
        const engineState = {
            schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
            battle: battleV2,
            rng: createScriptedRngState([]) // Empty script
        };

        const actionV2 = {
            type: 'INTERACT_OBJECTIVE' as const,
            participantId,
            objectiveId: 'main'
        };

        const result = reduceBattle(engineState, actionV2, { rng: { d6, d100 } });

        // 4. Parity/Correctness Assertions
        expect(result.next.rng.cursor).toBe(0);

        // Divergence Check: V2 should NOT consume AP
        expect(result.next.battle.participants[0].actionsRemaining).toBe(
            battleV2.participants[0].actionsRemaining
        );

        // Verify full state no-op
        const sigV2 = createBattleSignature(result.next.battle);
        const sigBaseline = createBattleSignature(battleV2);
        sigV2.log = [];
        sigBaseline.log = [];
        expect(sigV2).toEqual(sigBaseline);

        // 5. Event Correctness
        // Observability Fix: Expect DECLARED + RESOLVED(already_searched)
        expect(result.events).toHaveLength(2);
        expect(result.events[0].type).toBe('OBJECTIVE_INTERACT_DECLARED');
        expect(result.events[1]).toMatchObject({
            type: 'OBJECTIVE_INTERACT_RESOLVED',
            success: false,
            reason: 'already_searched'
        });
    });

    it('Scenario: Acquire Mission - Out of Range (Known Divergence)', () => {
        // 1. Setup
        const participantId = 'c1';
        const character = createTestCharacter({
            id: participantId,
            name: 'Scavenger',
            position: { x: 0, y: 2 }, // Distance 2 from item (max 1)
        });

        const baselineBattle = createMinimalBattle({
            participants: [character],
            missionType: 'Acquire'
        });
        
        baselineBattle.mission.itemPosition = { x: 0, y: 0 };
        baselineBattle.mission.itemCarrierId = null;

        const battleV1 = structuredClone(baselineBattle);
        const battleV2 = structuredClone(baselineBattle);

        // 2. V1 Execution
        const actionV1 = { 
            type: 'interact' as const, 
            payload: { characterId: participantId, objectiveId: 'main' } 
        };

        // V1 consumes AP even if out of range for Acquire (bug/feature)
        runMiddleware(battleV1, actionV1);

        expect(battleV1.participants[0].actionsRemaining).toBe(baselineBattle.participants[0].actionsRemaining - 1);
        expect(battleV1.mission.itemCarrierId).toBeNull();
        expect(vi.mocked(rollD6)).not.toHaveBeenCalled();
        mockRng.assertEmpty();

        // 3. V2 Replay
        const engineState = {
            schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
            battle: battleV2,
            rng: createScriptedRngState([])
        };

        const actionV2 = {
            type: 'INTERACT_OBJECTIVE' as const,
            participantId,
            objectiveId: 'main'
        };

        const result = reduceBattle(engineState, actionV2, { rng: { d6, d100 } });

        // 4. V2 Assertions - Strict No-Op
        expect(result.next.rng.cursor).toBe(0);
        
        // AP preserved
        expect(result.next.battle.participants[0].actionsRemaining).toBe(
            battleV2.participants[0].actionsRemaining
        );

        // State preserved
        const sigV2 = createBattleSignature(result.next.battle);
        const sigBaseline = createBattleSignature(battleV2);
        sigV2.log = [];
        sigBaseline.log = [];
        expect(sigV2).toEqual(sigBaseline);

        // No events
        // Observability Fix: We expect DECLARED and RESOLVED(out_of_range) even if state is No-Op
        expect(result.events).toHaveLength(2);
        expect(result.events[0].type).toBe('OBJECTIVE_INTERACT_DECLARED');
        expect(result.events[1]).toMatchObject({
            type: 'OBJECTIVE_INTERACT_RESOLVED',
            success: false,
            reason: 'out_of_range'
        });
    });

    it('Scenario: Acquire Mission - Invalid Item Position (Known Divergence)', () => {
        // 1. Setup
        const participantId = 'c1';
        const character = createTestCharacter({
            id: participantId,
            name: 'Scavenger',
            position: { x: 0, y: 0 },
        });

        const baselineBattle = createMinimalBattle({
            participants: [character],
            missionType: 'Acquire'
        });
        
        // Remove item position to simulate invalid state
        baselineBattle.mission.itemPosition = undefined;
        baselineBattle.mission.itemCarrierId = null;

        const battleV1 = structuredClone(baselineBattle);
        const battleV2 = structuredClone(baselineBattle);

        // 2. V1 Execution
        const actionV1 = { 
            type: 'interact' as const, 
            payload: { characterId: participantId, objectiveId: 'main' } 
        };

        // V1 consumes AP even if itemPosition is missing
        expect(() => runMiddleware(battleV1, actionV1)).not.toThrow();
        expect(battleV1.participants[0].actionsRemaining).toBe(baselineBattle.participants[0].actionsRemaining - 1);
        mockRng.assertEmpty();

        // 3. V2 Replay
        const engineState = {
            schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
            battle: battleV2,
            rng: createScriptedRngState([])
        };

        const actionV2 = {
            type: 'INTERACT_OBJECTIVE' as const,
            participantId,
            objectiveId: 'main'
        };

        const result = reduceBattle(engineState, actionV2, { rng: { d6, d100 } });

        // 4. V2 Assertions
        expect(result.next.rng.cursor).toBe(0);
        expect(result.next.battle.participants[0].actionsRemaining).toBe(
            battleV2.participants[0].actionsRemaining
        );
        
        // State preserved
        const sigV2 = createBattleSignature(result.next.battle);
        const sigBaseline = createBattleSignature(battleV2);
        sigV2.log = [];
        sigBaseline.log = [];
        expect(sigV2).toEqual(sigBaseline);

        // Events: Expect 'invalid_objective'
        expect(result.events).toHaveLength(2);
        expect(result.events[0].type).toBe('OBJECTIVE_INTERACT_DECLARED');
        expect(result.events[1]).toMatchObject({
            type: 'OBJECTIVE_INTERACT_RESOLVED',
            success: false,
            reason: 'invalid_objective'
        });
    });

    it('Scenario: Patrol Mission - No Point Found (Known Divergence)', () => {
        // 1. Setup
        const participantId = 'c1';
        const patrolPointId = 'p1';
        const patrolPos = { x: 5, y: 5 };
        
        const character = createTestCharacter({
            id: participantId,
            name: 'Ranger',
            position: { x: 0, y: 0 }, // Far from patrol point
        });

        const baselineBattle = createMinimalBattle({
            participants: [character],
            missionType: 'Patrol'
        });
        
        // Setup patrol point
        baselineBattle.mission.patrolPoints = [
            { id: patrolPointId, visited: false }
        ];
        baselineBattle.terrain = [
            makeTerrain({ id: patrolPointId, type: 'Individual', position: patrolPos, name: 'Patrol Point' })
        ];

        const battleV1 = structuredClone(baselineBattle);
        const battleV2 = structuredClone(baselineBattle);

        // 2. V1 Execution
        const actionV1 = { 
            type: 'interact' as const, 
            payload: { characterId: participantId, objectiveId: 'main' } 
        };

        runMiddleware(battleV1, actionV1);

        // V1 Behavior: Consumes AP even if no point found
        expect(battleV1.mission.patrolPoints?.[0].visited).toBe(false);
        expect(battleV1.participants[0].actionsRemaining).toBe(baselineBattle.participants[0].actionsRemaining - 1);
        mockRng.assertEmpty();

        // 3. V2 Replay
        const engineState = {
            schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
            battle: battleV2,
            rng: createScriptedRngState([])
        };

        const actionV2 = {
            type: 'INTERACT_OBJECTIVE' as const,
            participantId,
            objectiveId: 'main'
        };

        const result = reduceBattle(engineState, actionV2, { rng: { d6, d100 } });

        // 4. V2 Assertions - Strict No-Op
        expect(result.next.rng.cursor).toBe(0);
        expect(result.next.battle.participants[0].actionsRemaining).toBe(
            battleV2.participants[0].actionsRemaining
        );

        // State preserved
        const sigV2 = createBattleSignature(result.next.battle);
        const sigBaseline = createBattleSignature(battleV2);
        sigV2.log = [];
        sigBaseline.log = [];
        expect(sigV2).toEqual(sigBaseline);

        // Events
        expect(result.events).toHaveLength(2);
        expect(result.events[0].type).toBe('OBJECTIVE_INTERACT_DECLARED');
        expect(result.events[1]).toMatchObject({
            type: 'OBJECTIVE_INTERACT_RESOLVED',
            success: false,
            reason: 'invalid_objective'
        });
    });

    it('Scenario: Passive Mission (Secure) - Interaction is No-Op in V2 but consumes AP in V1', () => {
        // 1. Setup
        const participantId = 'c1';
        const character = createTestCharacter({
            id: participantId,
            name: 'Guard',
            position: { x: 5, y: 5 },
        });

        const baselineBattle = createMinimalBattle({
            participants: [character],
            missionType: 'Secure'
        });
        
        // Secure mission doesn't use objectiveId or position for interaction
        
        const battleV1 = structuredClone(baselineBattle);
        const battleV2 = structuredClone(baselineBattle);

        // 2. V1 Execution
        const actionV1 = { 
            type: 'interact' as const, 
            payload: { characterId: participantId, objectiveId: 'main' } 
        };

        runMiddleware(battleV1, actionV1);

        // V1 Behavior: Consumes AP (default fallthrough behavior)
        expect(battleV1.participants[0].actionsRemaining).toBe(baselineBattle.participants[0].actionsRemaining - 1);
        expect(vi.mocked(rollD6)).not.toHaveBeenCalled();
        mockRng.assertEmpty();

        // 3. V2 Replay
        const engineState = {
            schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
            battle: battleV2,
            rng: createScriptedRngState([])
        };

        const actionV2 = {
            type: 'INTERACT_OBJECTIVE' as const,
            participantId,
            objectiveId: 'main'
        };

        const result = reduceBattle(engineState, actionV2, { rng: { d6, d100 } });

        // 4. V2 Assertions - Strict No-Op
        expect(result.next.rng.cursor).toBe(0);
        expect(result.next.battle.participants[0].actionsRemaining).toBe(
            battleV2.participants[0].actionsRemaining
        );

        // State preserved
        const sigV2 = createBattleSignature(result.next.battle);
        const sigBaseline = createBattleSignature(battleV2);
        sigV2.log = [];
        sigBaseline.log = [];
        expect(sigV2).toEqual(sigBaseline);

        // Events: Expect invalid_objective (fallback for unsupported/passive types)
        expect(result.events).toHaveLength(2);
        expect(result.events[0].type).toBe('OBJECTIVE_INTERACT_DECLARED');
        expect(result.events[1]).toMatchObject({
            type: 'OBJECTIVE_INTERACT_RESOLVED',
            success: false,
            reason: 'invalid_objective'
        });
    });
});
