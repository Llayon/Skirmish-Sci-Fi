
import { describe, it, expect, beforeEach } from 'vitest';
import { hasLineOfSight, calculateCover } from './visibility';
import { Battle, BattleParticipant, Terrain } from '../../types';

// Helper to create a mock participant
const createMockParticipant = (id: string, x: number, y: number): BattleParticipant => ({
    id,
    type: 'character', // doesn't matter for these tests
    name: id,
    raceId: 'baseline_human',
    position: { x, y },
    // Fill in other required properties with defaults
    stats: { reactions: 1, speed: 5, combat: 0, toughness: 3, savvy: 0, luck: 1 },
    status: 'active',
    actionsRemaining: 2,
    actionsTaken: { move: false, combat: false, dash: false, interact: false },
    stunTokens: 0,
    currentLuck: 1,
    activeEffects: [],
    consumablesUsedThisTurn: 0,
    weapons: [],
    pronouns: 'they/them',
    backgroundId: 'drifter',
    motivationId: 'survival',
    classId: 'baseline_human',
    xp: 0,
    implants: [],
    utilityDevices: [],
    backstory: '...',
    upgradesAvailable: 0,
    injuries: [],
    task: 'idle',
    consumables: []
});

describe('Visibility Rules', () => {
    let battle: Battle;

    beforeEach(() => {
        battle = {
            id: 'test_battle',
            participants: [],
            gridSize: { width: 20, height: 20 },
            terrain: [],
            mission: { type: 'FightOff', titleKey: '', descriptionKey: '', status: 'in_progress' },
            log: [], round: 1, phase: 'quick_actions', quickActionOrder: [], slowActionOrder: [],
            reactionRolls: {}, reactionRerollsUsed: false, activeParticipantId: null,
            currentTurnIndex: 0, enemyTurnOrder: [], followUpState: null,
            enemiesLostThisRound: 0,
            heldTheField: false,
            difficulty: 'normal',
        };
    });

    describe('hasLineOfSight', () => {
        it('should be true in an open field', () => {
            const attacker = createMockParticipant('attacker', 1, 1);
            const target = createMockParticipant('target', 10, 10);
            battle.participants = [attacker, target];
            expect(hasLineOfSight(attacker, target, battle)).toBe(true);
        });

        it('should be false if a blocking wall is directly between them', () => {
            const attacker = createMockParticipant('attacker', 1, 5);
            const target = createMockParticipant('target', 10, 5);
            const wall: Terrain = {
                id: 'wall', type: 'Block', name: 'Wall', position: { x: 5, y: 5 }, size: { width: 1, height: 1 },
                isImpassable: true, blocksLineOfSight: true, providesCover: true, isDifficult: false
            };
            battle.participants = [attacker, target];
            battle.terrain = [wall];
            expect(hasLineOfSight(attacker, target, battle)).toBe(false);
        });

        it('should be true if the line of sight just grazes the corner of a wall', () => {
            const attacker = createMockParticipant('attacker', 1, 1);
            const target = createMockParticipant('target', 10, 10);
            const wall: Terrain = {
                id: 'wall', type: 'Block', name: 'Wall', position: { x: 5, y: 6 }, size: { width: 1, height: 1 },
                isImpassable: true, blocksLineOfSight: true, providesCover: true, isDifficult: false
            };
            battle.participants = [attacker, target];
            battle.terrain = [wall];
            expect(hasLineOfSight(attacker, target, battle)).toBe(true);
        });
        
        it('should be false if another participant is in the way', () => {
            const attacker = createMockParticipant('attacker', 1, 5);
            const blocker = createMockParticipant('blocker', 5, 5);
            const target = createMockParticipant('target', 10, 5);
            battle.participants = [attacker, blocker, target];
            expect(hasLineOfSight(attacker, target, battle)).toBe(false);
        });
    });

    describe('calculateCover', () => {
        it('should be false when the target is in the open', () => {
            const attacker = createMockParticipant('attacker', 1, 1);
            const target = createMockParticipant('target', 10, 10);
            battle.participants = [attacker, target];
            expect(calculateCover(attacker, target, battle)).toBe(false);
        });

        it('should be true if the target is standing in cover-providing terrain', () => {
            const attacker = createMockParticipant('attacker', 1, 1);
            const target = createMockParticipant('target', 10, 10);
            const cover: Terrain = {
                id: 'cover', type: 'Area', name: 'Rubble', position: { x: 10, y: 10 }, size: { width: 1, height: 1 },
                isImpassable: false, blocksLineOfSight: false, providesCover: true, isDifficult: true
            };
            battle.participants = [attacker, target];
            battle.terrain = [cover];
            expect(calculateCover(attacker, target, battle)).toBe(true);
        });

        it('should be true if the line of sight passes through cover-providing terrain', () => {
            const attacker = createMockParticipant('attacker', 1, 5);
            const target = createMockParticipant('target', 10, 5);
            const cover: Terrain = {
                id: 'cover', type: 'Individual', name: 'Barrel', position: { x: 5, y: 5 }, size: { width: 1, height: 1 },
                isImpassable: false, blocksLineOfSight: false, providesCover: true, isDifficult: false
            };
            battle.participants = [attacker, target];
            battle.terrain = [cover];
            expect(calculateCover(attacker, target, battle)).toBe(true);
        });

        it('should be false if line of sight is clear but there is cover nearby but not in the way', () => {
            const attacker = createMockParticipant('attacker', 1, 5);
            const target = createMockParticipant('target', 10, 5);
            const cover: Terrain = {
                id: 'cover', type: 'Individual', name: 'Barrel', position: { x: 5, y: 6 }, size: { width: 1, height: 1 },
                isImpassable: false, blocksLineOfSight: false, providesCover: true, isDifficult: false
            };
            battle.participants = [attacker, target];
            battle.terrain = [cover];
            expect(calculateCover(attacker, target, battle)).toBe(false);
        });
    });
});
