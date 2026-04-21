import { describe, it, expect } from 'vitest';
import { interactObjective } from './interactObjective';
import { EngineBattleState, BattleAction, EngineDeps } from '../types';
import { Battle, BattleParticipant, Mission, CharacterStats, Character, Position } from '@/types';

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
    // Explicitly typed as BattleParticipant (Character variant)
    return { type: 'character', ...char };
}

function makeMission(overrides: Partial<Mission> = {}): Mission {
    return {
        type: 'Deliver',
        titleKey: 'mission.deliver',
        descriptionKey: 'mission.deliver.desc',
        status: 'in_progress',
        ...overrides
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

describe('interactObjective', () => {
    it('Deliver mission: sets success status when package is delivered', () => {
        const participantId = 'carrier-1';
        const objPos: Position = { x: 10, y: 10 };
        
        const participant = makeParticipant({
            id: participantId,
            position: objPos // At target
        });

        const mission = makeMission({
            type: 'Deliver',
            itemCarrierId: participantId,
            objectivePosition: objPos,
            status: 'in_progress',
            packageDelivered: false
        });

        const battle = makeBattle({
            participants: [participant],
            mission
        });

        const state = makeEngineState(battle);

        const action: Extract<BattleAction, { type: 'INTERACT_OBJECTIVE' }> = {
            type: 'INTERACT_OBJECTIVE',
            participantId,
            objectiveId: 'obj-1'
        };

        const result = interactObjective(state, action, mockDeps);

        // Assertions
        expect(result.next.battle.mission.status).toBe('success');
        expect(result.next.battle.mission.packageDelivered).toBe(true);
        expect(result.next.battle.mission.itemCarrierId).toBeNull();

        // Immutability check
        expect(state.battle.mission.status).toBe('in_progress');
        expect(state.battle.mission.packageDelivered).toBe(false);
    });
});
