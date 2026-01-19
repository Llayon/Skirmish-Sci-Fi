import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireHook } from './traitSystem';
import { ShootingContext, AfterActionContext, Battle, BattleParticipant, Weapon } from '../types';

// Mocks
const rolls = vi.hoisted(() => ({
    rollD6: vi.fn(),
}));
vi.mock('./utils/rolls', () => ({
    rollD6: rolls.rollD6,
}));

const damage = vi.hoisted(() => ({
    applyHitAndSaves: vi.fn().mockReturnValue([]),
}));
vi.mock('./rules/damage', () => ({
    applyHitAndSaves: damage.applyHitAndSaves,
}));

// Helper
const createMockParticipant = (id: string, x: number, y: number): BattleParticipant => ({
    id,
    type: 'character',
    name: id,
    position: { x, y },
    stats: { combat: 1 },
    actionsTaken: { move: false },
    activeEffects: [],
} as BattleParticipant);

describe('Trait System', () => {
    let battle: Battle;
    let attacker: BattleParticipant;
    let target: BattleParticipant;

    beforeEach(() => {
        vi.resetAllMocks();
        attacker = createMockParticipant('attacker', 1, 1);
        target = createMockParticipant('target', 10, 10);
        battle = {
            participants: [attacker, target],
            log: [],
            terrain: [],
            gridSize: { width: 24, height: 24 },
        } as Battle;
    });

    describe('Shooting Traits', () => {
        it('heavy trait should apply -1 penalty if attacker moved', () => {
            attacker.actionsTaken.move = true;
            const context: ShootingContext = {
                battle,
                log: [],
                attacker,
                target,
                weapon: { traits: ['heavy'] } as Weapon,
                roll: { base: 4, bonus: 1, final: 0, targetNumber: 5, isHit: false, rerolledText: '' },
                hitsToResolve: 1,
                isAimed: false,
            };

            fireHook('onShootingRoll', context, ['heavy']);

            expect(context.roll.bonus).toBe(0); // 1 (base) - 1 (heavy) = 0
            expect(context.log.some(l => l.key === 'log.trait.heavyPenalty')).toBe(true);
        });

        it('snap_shot trait should apply +1 bonus at close range', () => {
            target.position = { x: 5, y: 5 }; // distance is 4
            const context: ShootingContext = {
                battle,
                log: [],
                attacker,
                target,
                weapon: { traits: ['snap_shot'] } as Weapon,
                roll: { base: 4, bonus: 1, final: 0, targetNumber: 3, isHit: false, rerolledText: '' },
                hitsToResolve: 1,
                isAimed: false,
            };

            fireHook('onShootingRoll', context, ['snap_shot']);

            expect(context.roll.bonus).toBe(2); // 1 (base) + 1 (snap_shot) = 2
            expect(context.log.some(l => l.key === 'log.trait.snapShotBonus')).toBe(true);
        });
        
        it('critical trait should add an extra hit on a roll of 6', () => {
             const context: ShootingContext = {
                battle,
                log: [],
                attacker,
                target,
                weapon: { traits: ['critical'] } as Weapon,
                roll: { base: 6, bonus: 1, final: 7, targetNumber: 5, isHit: true, rerolledText: '' },
                hitsToResolve: 1,
                isAimed: false,
            };
            
            fireHook('onShootingRoll', context, ['critical']);
            
            expect(context.hitsToResolve).toBe(2);
            expect(context.log.some(l => l.key === 'log.trait.criticalHit')).toBe(true);
        });
    });
    
    describe('After Action Traits', () => {
        it('area trait should attempt to hit nearby secondary targets', () => {
            const secondaryTarget = createMockParticipant('secondary', 11, 11);
            battle.participants.push(secondaryTarget);
            attacker.position = { x: 9, y: 9 };
            target.position = { x: 10, y: 10 };
            
            rolls.rollD6.mockReturnValueOnce(6); // secondary target gets hit

            const context: AfterActionContext = {
                battle,
                log: [],
                attacker,
                initialTarget: target,
                weapon: { id: 'test_grenade', traits: ['area'], range: 12 } as Weapon,
            };

            fireHook('afterAction', context, ['area']);
            
            expect(context.log.some(l => l.key === 'log.trait.areaEffect')).toBe(true);
            expect(context.log.some(l => l.key === 'log.info.bonusShotHit')).toBe(true);
            expect(damage.applyHitAndSaves).toHaveBeenCalled();
        });
    });
});
