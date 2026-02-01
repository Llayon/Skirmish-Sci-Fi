import { describe, it, expect } from 'vitest';
import { interactObjective } from './interactObjective';
import { EngineBattleState, BattleAction, EngineDeps } from '../types';
import { Battle, BattleParticipant, Mission, CharacterStats, Character, Position, Terrain, PatrolPoint } from '@/types';

// --- Type-safe helpers ---

const defaultStats: CharacterStats = {
    reactions: 3, speed: 4, combat: 0, toughness: 3, savvy: 0, luck: 0
};

const defaultPosition: Position = { x: 0, y: 0 };

function makeParticipant(overrides: Partial<Character> = {}): BattleParticipant {
    const char: Character = {
        id: 'p-1',
        name: 'TestChar',
        pronouns: 'they/them',
        raceId: 'baseline_human',
        backgroundId: 'bg-1',
        motivationId: 'mot-1',
        classId: 'class-1',
        stats: { ...defaultStats },
        xp: 0,
        consumables: [],
        weapons: [],
        implants: [],
        utilityDevices: [],
        backstory: '',
        injuries: [],
        task: 'idle',
        position: { ...defaultPosition },
        status: 'active',
        actionsRemaining: 2,
        actionsTaken: { move: false, combat: false, dash: false, interact: false },
        stunTokens: 0,
        currentLuck: 0,
        activeEffects: [],
        consumablesUsedThisTurn: 0,
        ...overrides
    };
    return { type: 'character', ...char };
}

function makeMission(overrides: Partial<Mission> = {}): Mission {
    return {
        type: 'Patrol',
        titleKey: 'mission.patrol',
        descriptionKey: 'mission.patrol.desc',
        status: 'in_progress',
        ...overrides
    };
}

function makeTerrain(id: string, position: Position): Terrain {
    return {
        id,
        name: 'Patrol Point',
        type: 'Individual',
        position,
        size: { width: 1, height: 1 },
        isDifficult: false,
        providesCover: false,
        blocksLineOfSight: false,
        isImpassable: false,
        isInteractive: true
    };
}

function makeBattle(overrides: Partial<Battle> = {}): Battle {
    return {
        id: 'battle-1',
        participants: [],
        gridSize: { width: 10, height: 10 },
        terrain: [],
        mission: makeMission(),
        log: [],
        round: 1,
        phase: 'slow_actions',
        difficulty: 'normal',
        quickActionOrder: [],
        slowActionOrder: [],
        reactionRolls: {},
        reactionRerollsUsed: false,
        activeParticipantId: null,
        currentTurnIndex: -1,
        enemyTurnOrder: [],
        followUpState: null,
        enemiesLostThisRound: 0,
        heldTheField: false,
        ...overrides
    };
}

function makeEngineState(battle: Battle): EngineBattleState {
    return {
        schemaVersion: 1,
        battle,
        rng: { cursor: 0, seed: 123 }
    };
}

const mockDeps: EngineDeps = {
    rng: {
        d6: (state) => ({ value: 6, next: state }),
        d100: (state) => ({ value: 50, next: state })
    }
};

describe('interactObjective - Patrol', () => {
    it('Patrol uses terrain center for range check (size > 1)', () => {
        const participantId = 'p-1';
        const pointId = 'point-1';
        // Terrain is 3x3 at 10,10. Center is at 11,11.
        // Top-left is 10,10.
        const terrainPos: Position = { x: 10, y: 10 };
        
        // Participant at 13,13.
        // Distance to top-left (10,10) is max(|13-10|, |13-10|) = 3 -> > 2 (Out of range by old logic)
        // Distance to center (11,11) is max(|13-11|, |13-11|) = 2 -> <= 2 (In range by new logic)
        const participantPos: Position = { x: 13, y: 13 };

        const participant = makeParticipant({
            id: participantId,
            position: participantPos
        });

        const patrolPoints: PatrolPoint[] = [
            { id: pointId, visited: false }
        ];

        const terrain = [{
            ...makeTerrain(pointId, terrainPos),
            size: { width: 3, height: 3 }
        }];

        const mission = makeMission({ type: 'Patrol', patrolPoints });
        const battle = makeBattle({ participants: [participant], mission, terrain });
        const state = makeEngineState(battle);

        const action = {
            type: 'INTERACT_OBJECTIVE' as const,
            participantId,
            objectiveId: pointId
        };

        const result = interactObjective(state, action, mockDeps);

        // Should visit because we are within range of center
        expect(result.next.battle.mission.patrolPoints?.[0].visited).toBe(true);
        
        expect(result.events).toContainEqual(expect.objectContaining({
            type: 'OBJECTIVE_INTERACT_RESOLVED',
            success: true
        }));
    });

    it('Marks a patrol point visited', () => {
        const participantId = 'p-1';
        const pointId = 'point-1';
        const pointPos: Position = { x: 1, y: 0 }; // Adjacent to 0,0

        const participant = makeParticipant({
            id: participantId,
            position: { x: 0, y: 0 }
        });

        const patrolPoints: PatrolPoint[] = [
            { id: pointId, visited: false },
            { id: 'point-2', visited: false }
        ];

        const terrain = [
            makeTerrain(pointId, pointPos),
            makeTerrain('point-2', { x: 10, y: 10 })
        ];

        const mission = makeMission({
            type: 'Patrol',
            patrolPoints
        });

        const battle = makeBattle({
            participants: [participant],
            mission,
            terrain
        });

        const state = makeEngineState(battle);

        const action = {
            type: 'INTERACT_OBJECTIVE' as const,
            participantId,
            objectiveId: pointId
        };

        const result = interactObjective(state, action, mockDeps);

        // Check if point is visited
        const nextPoints = result.next.battle.mission.patrolPoints;
        const targetPoint = nextPoints?.find(p => p.id === pointId);
        expect(targetPoint?.visited).toBe(true);

        // Check if other point is untouched
        expect(nextPoints?.find(p => p.id === 'point-2')?.visited).toBe(false);

        // Check AP cost
        const nextParticipant = result.next.battle.participants.find(p => p.id === participantId);
        expect(nextParticipant?.actionsRemaining).toBe(1); // Started with 2
        expect(nextParticipant?.actionsTaken?.interact).toBe(true);

        // Check events
        expect(result.events).toContainEqual(expect.objectContaining({
            type: 'OBJECTIVE_INTERACT_RESOLVED',
            participantId,
            objectiveId: pointId,
            success: true
        }));

        // Check log
        expect(result.log).toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'log.mission.patrol.scanned' })
        ]));
    });

    it('All points visited => mission success', () => {
        const participantId = 'p-1';
        const pointId = 'point-2';
        const pointPos: Position = { x: 0, y: 0 }; // On top

        const participant = makeParticipant({
            id: participantId,
            position: pointPos
        });

        const patrolPoints: PatrolPoint[] = [
            { id: 'point-1', visited: true },
            { id: pointId, visited: false }
        ];

        const terrain = [
            makeTerrain('point-1', { x: 10, y: 10 }),
            makeTerrain(pointId, pointPos)
        ];

        const mission = makeMission({
            type: 'Patrol',
            patrolPoints
        });

        const battle = makeBattle({
            participants: [participant],
            mission,
            terrain
        });

        const state = makeEngineState(battle);

        const action = {
            type: 'INTERACT_OBJECTIVE' as const,
            participantId,
            objectiveId: pointId
        };

        const result = interactObjective(state, action, mockDeps);

        // Check if point is visited
        const nextPoints = result.next.battle.mission.patrolPoints;
        expect(nextPoints?.every(p => p.visited)).toBe(true);

        // Check mission status
        expect(result.next.battle.mission.status).toBe('success');

        // Check success log
        expect(result.log).toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'log.mission.success' })
        ]));
    });

    it('Does nothing if point too far', () => {
        const participantId = 'p-1';
        const pointId = 'point-1';
        const pointPos: Position = { x: 5, y: 5 }; // Far away

        const participant = makeParticipant({
            id: participantId,
            position: { x: 0, y: 0 }
        });

        const patrolPoints: PatrolPoint[] = [
            { id: pointId, visited: false }
        ];

        const terrain = [makeTerrain(pointId, pointPos)];

        const mission = makeMission({ type: 'Patrol', patrolPoints });
        const battle = makeBattle({ participants: [participant], mission, terrain });
        const state = makeEngineState(battle);

        const action = {
            type: 'INTERACT_OBJECTIVE' as const,
            participantId,
            objectiveId: pointId
        };

        const result = interactObjective(state, action, mockDeps);

        // Should not visit
        expect(result.next.battle.mission.patrolPoints?.[0].visited).toBe(false);
        
        // Should emit failure event
        expect(result.events).toContainEqual(expect.objectContaining({
            type: 'OBJECTIVE_INTERACT_RESOLVED',
            success: false,
            reason: 'out_of_range'
        }));
    });
});
