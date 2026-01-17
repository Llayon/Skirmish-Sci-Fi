import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveBrawling } from './brawling';
import { Battle, BattleParticipant, Weapon } from '../../types';
import * as damage from './damage';

// Mocks
const rolls = vi.hoisted(() => ({
    rollD6: vi.fn(),
}));
vi.mock('../utils/rolls', () => ({
    rollD6: rolls.rollD6,
}));

// Mock the damage application to prevent deep dependencies
const applyHitAndSavesSpy = vi.spyOn(damage, 'applyHitAndSaves');

// Helper
const createMockParticipant = (id: string, x: number, y: number, combat: number = 0, speed: number = 5, weapons: { instanceId: string, weaponId: string }[] = [], status: 'active' | 'stunned' | 'casualty' = 'active'): BattleParticipant => ({
    id,
    type: 'character',
    name: id,
    position: { x, y },
    stats: { reactions: 1, speed, combat, toughness: 3, savvy: 0, luck: 1 },
    status,
    stunTokens: status === 'stunned' ? 2 : 0,
    actionsRemaining: 2,
    actionsTaken: { move: false, combat: false, dash: false, interact: false },
    currentLuck: 1,
    activeEffects: [],
    consumablesUsedThisTurn: 0,
    weapons,
} as BattleParticipant);

const createMockWeapon = (id: string, traits: string[], damage: number = 0): Weapon => ({
    id,
    range: 'brawl',
    shots: 0,
    damage,
    traits,
});

vi.mock('../data/items', async () => {
    const actual = await vi.importActual('../data/items');
    return {
        ...actual,
        getWeaponById: (id: string) => {
            if (id === 'blade') return createMockWeapon('blade', ['melee']);
            if (id === 'hold_out_pistol') return createMockWeapon('hold_out_pistol', ['pistol']);
            if (id === 'boarding_saber') return createMockWeapon('boarding_saber', ['melee', 'elegant']);
            if (id === 'power_claw') return createMockWeapon('power_claw', ['melee', 'clumsy']);
            return undefined;
        }
    };
});

describe('Brawling Rules: resolveBrawling', () => {
    let battle: Battle;
    let attacker: BattleParticipant;
    let defender: BattleParticipant;

    beforeEach(() => {
        vi.resetAllMocks();
        attacker = createMockParticipant('attacker', 1, 1, 1);
        defender = createMockParticipant('defender', 2, 1, 1);
        battle = {
            participants: [attacker, defender],
            gridSize: { width: 10, height: 10 },
            terrain: [],
            followUpState: null,
            log: [],
        } as Battle;
        applyHitAndSavesSpy.mockImplementation((b, a, target, w, isR) => {
            target.status = 'stunned'; // default outcome for a hit
            return [];
        });
    });

    it('attacker wins on higher roll', () => {
        defender.type = 'enemy'; // Make sure defender is an opponent
        rolls.rollD6.mockReturnValueOnce(5).mockReturnValueOnce(3);
        const log = resolveBrawling(attacker, defender, undefined, battle, null);
        expect(log.some(l => l.key === 'log.info.brawlWinner' && l.params?.name === 'attacker')).toBe(true);
        expect(applyHitAndSavesSpy).toHaveBeenCalledOnce();
        expect(applyHitAndSavesSpy).toHaveBeenCalledWith(battle, attacker, defender, expect.anything(), false);
    });

    it('creates a follow-up state when winner takes out loser', () => {
        defender.type = 'enemy'; // Make sure defender is an opponent
        rolls.rollD6.mockReturnValueOnce(6).mockReturnValueOnce(1);
        applyHitAndSavesSpy.mockImplementation((b, a, target) => {
            target.status = 'casualty';
            return [];
        });
        resolveBrawling(attacker, defender, undefined, battle, null);
        expect(battle.followUpState).not.toBeNull();
        expect(battle.followUpState?.participantId).toBe('attacker');
    });

    it('pushes back loser on non-casualty win', () => {
        defender.type = 'enemy'; // Make sure defender is an opponent
        rolls.rollD6.mockReturnValueOnce(5).mockReturnValueOnce(3);
        resolveBrawling(attacker, defender, undefined, battle, null);
        const defenderState = battle.participants.find(p => p.id === 'defender');
        expect(defenderState?.position).toEqual({ x: 3, y: 1 });
    });

    it('applies stun bonus to attacker if defender is stunned', () => {
        defender.type = 'enemy'; // Make sure defender is an opponent
        defender.status = 'stunned';
        defender.stunTokens = 2;
        rolls.rollD6.mockReturnValue(3); // Rolls are equal
        // Attacker total: 3(roll)+1(combat)+2(stun) = 6
        // Defender total: 3(roll)+1(combat) = 4
        const log = resolveBrawling(attacker, defender, undefined, battle, null);
        expect(log.some(l => l.key === 'log.info.brawlerStunBonus')).toBe(true);
        expect(log.some(l => l.key === 'log.info.brawlWinner' && l.params?.name === 'attacker')).toBe(true);
        expect(defender.stunTokens).toBe(0); // Stun tokens are removed
    });

    it('handles 1v2 combat correctly', () => {
        const defender2 = createMockParticipant('defender2', 1, 2, 1);
        defender2.type = 'enemy'; // Make sure it's recognized as an opponent
        defender.type = 'enemy'; // Make sure original defender is also an opponent
        battle.participants.push(defender2);
        rolls.rollD6.mockReturnValue(6); // Attacker always wins
        
        let callCount = 0;
        applyHitAndSavesSpy.mockImplementation((b, a, target) => {
            callCount++;
            if (callCount === 1) {
                // First defender goes down
                target.status = 'casualty';
            }
            // Second defender stays active for the second round
            return [];
        });
        
        const log = resolveBrawling(attacker, defender, undefined, battle, null);

        // Check for outnumbered log
        expect(log.some(l => l.key === 'log.info.brawlOutnumbered')).toBe(true);
        // Check log for fighting the second opponent
        expect(log.some(l => l.key === 'log.info.brawlSecondOpponent')).toBe(true);
        // Attacker should have fought both (applyHitAndSaves called multiple times per hit)
        expect(applyHitAndSavesSpy).toHaveBeenCalled();
    });
});