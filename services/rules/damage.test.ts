import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyHitAndSaves } from './damage';
import { Battle, BattleParticipant, Weapon, ProtectiveDevice } from '../../types';

// Mocks
const rolls = vi.hoisted(() => ({
    rollD6: vi.fn(),
}));
vi.mock('../utils/rolls', () => ({
    rollD6: rolls.rollD6,
}));

vi.mock('../data/items', async () => {
    const actual = await vi.importActual('../data/items');
    return {
        ...actual,
        getProtectiveDeviceById: (id: string): ProtectiveDevice | undefined => {
            if (id === 'combat_armor') return { id: 'combat_armor', type: 'armor', savingThrow: 5 };
            return undefined;
        }
    };
});

// Helper
const createMockParticipant = (id: string, toughness: number, luck: number = 0, armor?: string, consumables: string[] = []): BattleParticipant => ({
    id,
    type: 'character',
    name: id,
    position: { x: 1, y: 1 },
    stats: { reactions: 1, speed: 5, combat: 0, toughness, savvy: 0, luck },
    status: 'active',
    currentLuck: luck,
    armor,
    consumables,
    stunTokens: 0,
    activeEffects: [],
    // other required properties...
} as BattleParticipant);

const createMockWeapon = (damage: number, traits: string[] = []): Weapon => ({
    id: 'test_weapon',
    range: 24,
    shots: 1,
    damage,
    traits,
});


describe('Damage Rules: applyHitAndSaves', () => {
    let battle: Battle;
    let attacker: BattleParticipant;
    let target: BattleParticipant;

    beforeEach(() => {
        vi.resetAllMocks();
        attacker = createMockParticipant('attacker', 3);
        target = createMockParticipant('target', 3);
        battle = {
            participants: [attacker, target],
            gridSize: { width: 10, height: 10 },
            mission: { type: 'FightOff' }
            // other properties...
        } as unknown as Battle;
    });

    it('should cause STUN on non-lethal hit (damage < toughness)', () => {
        rolls.rollD6.mockReturnValue(2); // Damage roll 2 + 0 bonus = 2. Toughness is 3.
        const weapon = createMockWeapon(0);
        
        applyHitAndSaves(battle, attacker, target, weapon, true);

        expect(target.status).toBe('stunned');
        expect(target.stunTokens).toBe(1);
    });

    it('should cause CASUALTY on lethal hit (damage >= toughness)', () => {
        rolls.rollD6.mockReturnValue(4); // Damage roll 4 > toughness 3
        const weapon = createMockWeapon(0);

        applyHitAndSaves(battle, attacker, target, weapon, true);

        expect(target.status).toBe('casualty');
    });

    it('should downgrade a lethal hit to STUN if armor save is successful', () => {
        target.armor = 'combat_armor';
        rolls.rollD6
            .mockReturnValueOnce(5) // Successful save (>=5)
            .mockReturnValueOnce(4); // Lethal damage roll

        const weapon = createMockWeapon(0);
        const log = applyHitAndSaves(battle, attacker, target, weapon, true);
        
        expect(log.some(l => l.key === 'log.info.saveSuccess')).toBe(true);
        expect(target.status).toBe('stunned');
        expect(target.stunTokens).toBe(0); // Save prevents stun marker
    });
    
    it('should NOT downgrade a lethal hit if armor save fails', () => {
        target.armor = 'combat_armor';
        rolls.rollD6
            .mockReturnValueOnce(4) // Failed save (<5)
            .mockReturnValueOnce(5); // Lethal damage roll

        const weapon = createMockWeapon(0);
        applyHitAndSaves(battle, attacker, target, weapon, true);
        
        expect(target.status).toBe('casualty');
    });

    it('should ignore armor save if weapon is Piercing', () => {
        target.armor = 'combat_armor';
        rolls.rollD6.mockReturnValue(5); // Lethal damage roll
        const weapon = createMockWeapon(0, ['piercing']);

        const log = applyHitAndSaves(battle, attacker, target, weapon, true);

        expect(log.some(l => l.key === 'log.trait.savePierced')).toBe(true);
        expect(target.status).toBe('casualty');
    });

    it('should negate a hit on a successful Luck roll (4+)', () => {
        target = createMockParticipant('target_lucky', 3, 1);
        battle.participants = [attacker, target];
        rolls.rollD6.mockReturnValueOnce(4); // Successful luck roll

        const weapon = createMockWeapon(0);
        applyHitAndSaves(battle, attacker, target, weapon, true);

        expect(target.status).toBe('active');
        expect(target.currentLuck).toBe(0); // Luck point is spent
    });
    
    it('should NOT negate a hit on a failed Luck roll (1-3)', () => {
        target = createMockParticipant('target_lucky', 3, 1);
        battle.participants = [attacker, target];
        rolls.rollD6
            .mockReturnValueOnce(3) // Failed luck roll
            .mockReturnValueOnce(5); // Lethal damage roll

        const weapon = createMockWeapon(0);
        applyHitAndSaves(battle, attacker, target, weapon, true);
        
        expect(target.status).toBe('casualty');
        expect(target.currentLuck).toBe(0);
    });

    it('should use a stim-pack to auto-save from a lethal hit', () => {
        target.consumables = ['stim-pack'];
        rolls.rollD6.mockReturnValue(6); // Lethal damage roll
        const weapon = createMockWeapon(0);

        applyHitAndSaves(battle, attacker, target, weapon, true);
        
        expect(target.status).toBe('stunned');
        expect(target.stunTokens).toBe(1);
        expect(target.consumables).not.toContain('stim-pack');
    });
});