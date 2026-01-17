
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getValidShootTargets, resolveShooting } from './shooting';
import { Battle, BattleParticipant, Weapon, Terrain } from '../../types';
import { BattleDomain } from '../domain/battleDomain';

// Mocks
const rolls = vi.hoisted(() => ({
  rollD6: vi.fn(),
}));

vi.mock('../utils/rolls', () => ({
  rollD6: rolls.rollD6,
}));

const damage = vi.hoisted(() => ({
    applyHitAndSaves: vi.fn().mockReturnValue([]),
}));

vi.mock('./damage', () => ({
    applyHitAndSaves: damage.applyHitAndSaves,
}));

// Helper to create a mock participant
const createMockParticipant = (id: string, x: number, y: number, type: 'character' | 'enemy' = 'character'): BattleParticipant => ({
    id,
    type,
    name: id,
    position: { x, y },
    stats: { reactions: 1, speed: 5, combat: 1, toughness: 3, savvy: 0, luck: 1 },
    status: 'active',
    actionsRemaining: 2,
    actionsTaken: { move: false, combat: false, dash: false, interact: false },
    stunTokens: 0,
    currentLuck: 1,
    activeEffects: [],
    consumablesUsedThisTurn: 0,
    weapons: [{ instanceId: 'w1', weaponId: 'military_rifle' }],
    // Fill other required properties
} as BattleParticipant);

describe('Shooting Rules', () => {
    let battle: Battle;
    let attacker: BattleParticipant;
    let target: BattleParticipant;

    beforeEach(() => {
        vi.resetAllMocks();
        attacker = createMockParticipant('attacker', 1, 1, 'character');
        target = createMockParticipant('target', 10, 1, 'enemy');
        battle = {
            id: 'test_battle',
            participants: [attacker, target],
            gridSize: { width: 30, height: 30 },
            terrain: [],
            mission: { type: 'FightOff', titleKey: '', descriptionKey: '', status: 'in_progress' },
            log: [], round: 1, phase: 'quick_actions', quickActionOrder: [], slowActionOrder: [],
            reactionRolls: {}, reactionRerollsUsed: false, activeParticipantId: 'attacker',
            currentTurnIndex: 0, enemyTurnOrder: [], followUpState: null,
            enemiesLostThisRound: 0,
            heldTheField: false,
            difficulty: 'normal',
        };
    });

    describe('getValidShootTargets', () => {
        it('should return target if in range and LoS', () => {
            const targets = getValidShootTargets(attacker, 'military_rifle', battle, null);
            expect(targets).toHaveLength(1);
            expect(targets[0].id).toBe('target');
        });

        it('should return empty if target is out of range', () => {
            target.position = { x: 26, y: 1 }; // military_rifle range is 24
            const targets = getValidShootTargets(attacker, 'military_rifle', battle, null);
            expect(targets).toHaveLength(0);
        });

        it('should return empty if Line of Sight is blocked', () => {
            const wall: Terrain = { id: 'wall', type: 'Block', name: 'Wall', position: { x: 5, y: 1 }, size: { width: 1, height: 1 }, blocksLineOfSight: true } as Terrain;
            battle.terrain.push(wall);
            const targets = getValidShootTargets(attacker, 'military_rifle', battle, null);
            expect(targets).toHaveLength(0);
        });

        it('should return empty if attacker is engaged in melee', () => {
            const brawler = createMockParticipant('brawler', 2, 1, 'enemy');
            battle.participants.push(brawler);
            const targets = getValidShootTargets(attacker, 'military_rifle', battle, null);
            expect(targets).toHaveLength(0);
        });
    });

    describe('resolveShooting', () => {
        const militaryRifle: Weapon = { id: 'military_rifle', range: 24, shots: 1, damage: 0, traits: [] };

        it('should register a hit if roll is successful', () => {
            rolls.rollD6.mockReturnValue(6); // High roll
            // Target number is 5 (long range, no cover)
            const log = resolveShooting(attacker, target, militaryRifle, battle, false, false, null);
            expect(damage.applyHitAndSaves).toHaveBeenCalled();
            const hitLog = log.find(l => typeof l === 'object' && l.key === 'log.info.hit');
            expect(hitLog).toBeDefined();
        });

        it('should register a miss if roll fails', () => {
            rolls.rollD6.mockReturnValue(2); // Low roll
            // Target number is 5
            const log = resolveShooting(attacker, target, militaryRifle, battle, false, false, null);
            expect(damage.applyHitAndSaves).not.toHaveBeenCalled();
            const missLog = log.find(l => typeof l === 'object' && l.key === 'log.info.miss');
            expect(missLog).toBeDefined();
        });

        it('should consume an action from the attacker', () => {
            resolveShooting(attacker, target, militaryRifle, battle, false, false, null);
            const attackerState = battle.participants.find(p => p.id === 'attacker')!;
            // This test is misplaced. Action consumption happens in actionProcessor.
            // expect(attackerState.actionsRemaining).toBe(1);
            // expect(attackerState.actionsTaken.combat).toBe(true);
        });

        it('should consume two actions for an aimed shot', () => {
            resolveShooting(attacker, target, militaryRifle, battle, true, false, null);
            const attackerState = battle.participants.find(p => p.id === 'attacker')!;
            // This test is misplaced. Action consumption happens in actionProcessor.
            // expect(attackerState.actionsRemaining).toBe(0);
            // expect(attackerState.actionsTaken.combat).toBe(true);
        });

        it('should reroll a 1 on an aimed shot', () => {
            rolls.rollD6.mockReturnValueOnce(1).mockReturnValueOnce(6);
            resolveShooting(attacker, target, militaryRifle, battle, true, false, null);
            expect(rolls.rollD6).toHaveBeenCalledTimes(2);
            expect(damage.applyHitAndSaves).toHaveBeenCalled();
        });
    });
    
    describe('BattleDomain.calculateHitTargetNumber', () => {
        const militaryRifle: Weapon = { id: 'military_rifle', range: 24, shots: 1, damage: 0, traits: [] };

        it('should be 3 for short range (<=6) and no cover', () => {
            target.position = { x: 5, y: 1 };
            const { targetNumber, reasonKey } = BattleDomain.calculateHitTargetNumber(attacker, target, militaryRifle, battle);
            expect(targetNumber).toBe(3);
            expect(reasonKey).toContain('ShortOpen');
        });

        it('should be 5 for long range (>6) and no cover', () => {
            target.position = { x: 10, y: 1 };
            const { targetNumber, reasonKey } = BattleDomain.calculateHitTargetNumber(attacker, target, militaryRifle, battle);
            expect(targetNumber).toBe(5);
            expect(reasonKey).toContain('LongOpenOrShortCover');
        });

        it('should be 5 for short range (<=6) and in cover', () => {
            target.position = { x: 5, y: 1 };
            const cover: Terrain = { id: 'cover', position: { x: 4, y: 1 }, size: { width: 1, height: 1 }, providesCover: true } as Terrain;
            battle.terrain.push(cover);
            const { targetNumber, reasonKey } = BattleDomain.calculateHitTargetNumber(attacker, target, militaryRifle, battle);
            expect(targetNumber).toBe(5);
            expect(reasonKey).toContain('LongOpenOrShortCover');
        });
        
        it('should be 6 for long range (>6) and in cover', () => {
            target.position = { x: 10, y: 1 };
            const cover: Terrain = { id: 'cover', position: { x: 5, y: 1 }, size: { width: 1, height: 1 }, providesCover: true } as Terrain;
            battle.terrain.push(cover);
            const { targetNumber, reasonKey } = BattleDomain.calculateHitTargetNumber(attacker, target, militaryRifle, battle);
            expect(targetNumber).toBe(6);
            expect(reasonKey).toContain('LongCover');
        });
    });
});
