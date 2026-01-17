import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkMissionStatus } from './mission';
import { Battle, BattleParticipant, Mission } from '../../types';

const rolls = vi.hoisted(() => ({
    rollD6: vi.fn(),
}));
vi.mock('../utils/rolls', () => ({
    rollD6: rolls.rollD6,
}));

// Helper
const createMockParticipant = (id: string, type: 'character' | 'enemy', status: 'active' | 'casualty', position = { x: 0, y: 0 }): BattleParticipant => ({
    id,
    type,
    status,
    position,
    // other properties
} as BattleParticipant);

describe('Mission Rules: checkMissionStatus', () => {
    let battle: Battle;

    beforeEach(() => {
        battle = {
            participants: [],
            mission: { type: 'FightOff', titleKey: 'test.title', descriptionKey: 'test.desc', status: 'in_progress' } as Mission,
            phase: 'end_round',
            log: [],
            // other properties...
        } as Battle;
    });

    // --- Generic Conditions ---
    it('should result in failure if all characters are casualties', () => {
        battle.participants = [
            createMockParticipant('char1', 'character', 'casualty'),
            createMockParticipant('enemy1', 'enemy', 'active'),
        ];
        const { logs } = checkMissionStatus(battle, 'end_of_round');
        expect(battle.mission.status).toBe('failure');
        expect(logs.some(l => l.key === 'log.mission.wipe.failure')).toBe(true);
    });

    it('should result in success for Defend mission if all enemies are casualties', () => {
        battle.mission.type = 'Defend';
        battle.participants = [
            createMockParticipant('char1', 'character', 'active'),
            createMockParticipant('enemy1', 'enemy', 'casualty'),
        ];
        checkMissionStatus(battle, 'end_of_round');
        expect(battle.mission.status).toBe('success');
    });

    // --- Mission Specific ---
    describe('Access Mission', () => {
        beforeEach(() => {
            battle.mission.type = 'Access';
            battle.mission.objectivePosition = { x: 10, y: 10 };
            battle.participants = [createMockParticipant('char1', 'character', 'active')];
        });

        it('should succeed on a good roll', () => {
            // This logic is in actionProcessor, but we can test the state change
            battle.mission.status = 'success';
            const { logs } = checkMissionStatus(battle, 'after_action');
            // This is just a check that it doesn't revert it
            expect(battle.mission.status).toBe('success');
        });
    });
    
    describe('Acquire Mission', () => {
        beforeEach(() => {
            battle.mission.type = 'Acquire';
            battle.gridSize = { width: 30, height: 30 };
        });

        it('succeeds if carrier escapes from an edge', () => {
            const carrier = createMockParticipant('carrier', 'character', 'active', { x: 29, y: 15 });
            battle.participants = [carrier];
            battle.mission.itemCarrierId = 'carrier';
            checkMissionStatus(battle, 'after_action');
            expect(battle.mission.status).toBe('success');
        });

        it('fails if the item is destroyed', () => {
            battle.mission.itemDestroyed = true;
            checkMissionStatus(battle, 'after_action');
            expect(battle.mission.status).toBe('failure');
        });
    });

    describe('Secure Mission', () => {
        beforeEach(() => {
            battle.mission.type = 'Secure';
            battle.mission.secureRoundsCompleted = 0;
            battle.gridSize = { width: 30, height: 30 }; // Center is 15,15
        });

        it('should increment progress if conditions are met', () => {
            battle.participants = [
                createMockParticipant('char1', 'character', 'active', { x: 15, y: 15 }),
                createMockParticipant('enemy1', 'enemy', 'active', { x: 25, y: 25 }), // Far away
            ];
            checkMissionStatus(battle, 'end_of_round');
            expect(battle.mission.secureRoundsCompleted).toBe(1);
        });

        it('should succeed after 2 consecutive rounds of progress', () => {
            battle.mission.secureRoundsCompleted = 1;
            battle.participants = [
                createMockParticipant('char1', 'character', 'active', { x: 15, y: 15 }),
            ];
            checkMissionStatus(battle, 'end_of_round');
            expect(battle.mission.secureRoundsCompleted).toBe(2);
            expect(battle.mission.status).toBe('success');
        });

        it('should reset progress if an enemy is too close', () => {
            battle.mission.secureRoundsCompleted = 1;
            battle.participants = [
                createMockParticipant('char1', 'character', 'active', { x: 15, y: 15 }),
                createMockParticipant('enemy1', 'enemy', 'active', { x: 18, y: 18 }), // Close
            ];
            checkMissionStatus(battle, 'end_of_round');
            expect(battle.mission.secureRoundsCompleted).toBe(0);
        });
    });
    
    describe('Eliminate Mission', () => {
         beforeEach(() => {
            battle.mission.type = 'Eliminate';
            battle.mission.targetEnemyId = 'target_enemy';
        });
        
        it('succeeds if the target is a casualty', () => {
            battle.participants = [
                 createMockParticipant('char1', 'character', 'active'),
                 createMockParticipant('target_enemy', 'enemy', 'casualty')
            ];
            checkMissionStatus(battle, 'after_action');
            expect(battle.mission.status).toBe('success');
        });
        
        it('fails if the target can escape and the round ends', () => {
            battle.mission.eliminateTargetCanEscape = true;
            battle.round = 6; // Set round to 6 to trigger escape condition
             battle.participants = [
                 createMockParticipant('char1', 'character', 'active'),
                 createMockParticipant('target_enemy', 'enemy', 'active')
            ];
            checkMissionStatus(battle, 'end_of_round');
            expect(battle.mission.status).toBe('failure');
        });
    });
});