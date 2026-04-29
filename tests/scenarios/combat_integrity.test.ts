import { describe, it, expect } from 'vitest';
import { EngineBattleState, EngineDeps } from '@/services/engine/battle/types';
import { reduceBattle } from '@/services/engine/battle/reduceBattle';
import { Battle, BattleParticipant } from '@/types';
import { ShootingWeapon } from '@/services/engine/battle/rules/shootingRules';

describe('Combat Integrity Deep Verification', () => {
    const createParticipant = (id: string, side: 'player' | 'enemy', combat: number): BattleParticipant => ({
        id,
        name: id,
        position: { x: 0, y: 0 },
        status: 'active',
        stats: { speed: 4, reactions: 3, combat, toughness: 4, savvy: 3, aim: 0, luck: 0 },
        type: side === 'player' ? 'character' : 'enemy',
        side,
        weapons: [{ id: 'pistol', range: 12, shots: 1, damage: 1, traits: [] } as ShootingWeapon],
        activeEffects: [],
        consumables: [],
        stunTokens: 0,
        actionsRemaining: 2,
        actionsTaken: { move: false, combat: false, dash: false, interact: false },
        currentLuck: 0,
        consumablesUsedThisTurn: 0,
        utilityDevices: []
    } as unknown as BattleParticipant);

    const createState = (participants: BattleParticipant[]): EngineBattleState => ({
        schemaVersion: 1,
        battle: {
            participants,
            gridSize: { width: 10, height: 10 },
            terrain: [],
            mission: { status: 'active' }
        } as unknown as Battle,
        rng: { seed: 123, cursor: 0 }
    });

    const deps: EngineDeps = {
        rng: {
            d6: (s) => {
                // Scripted RNG for predictable verification
                const values = [1, 6, 4, 2, 5, 3]; // 1: Miss, 2: Hit, etc.
                const val = values[s.cursor % values.length];
                return { value: val as any, next: { ...s, cursor: s.cursor + 1 } };
            },
            d100: (s) => ({ value: 50, next: { ...s, cursor: s.cursor + 1 } })
        }
    };

    it('Rules: Shooting should correctly calculate TN and consume RNG', () => {
        const attacker = createParticipant('Hero', 'player', 1);
        const target = createParticipant('Villain', 'enemy', 1);
        target.position = { x: 8, y: 0 }; // Distance 8 -> TN 5
        const state = createState([attacker, target]);

        const action = {
            type: 'SHOOT_ATTACK' as const,
            attackerId: 'Hero',
            targetId: 'Villain',
            weapon: attacker.weapons[0] as ShootingWeapon
        };

        // First attempt: Roll 1 + Combat 1 = 2 (TN 5) -> MISS
        const result1 = reduceBattle(state, action, deps);
        expect(result1.events.find(e => e.type === 'SHOT_RESOLVED')).toMatchObject({ hit: false });
        expect(result1.next.rng.cursor).toBe(1);

        // Second attempt (manually using next state): Roll 6 + Combat 1 = 7 (TN 5) -> HIT
        // Then Damage Roll: 4 + Damage 1 = 5 (Toughness 4) -> LETHAL
        const result2 = reduceBattle(result1.next, action, deps);
        expect(result2.events.find(e => e.type === 'SHOT_RESOLVED')).toMatchObject({ hit: true });
        expect(result2.next.battle.participants.find(p => p.id === 'Villain')?.status).toBe('casualty');
        expect(result2.next.rng.cursor).toBe(3); // 1 from first + 2 from second (hit + damage)
    });

    it('Rules: Brawl should correctly determine winner and handle pushback', () => {
        const attacker = createParticipant('Hero', 'player', 2);
        const target = createParticipant('Villain', 'enemy', 1);
        attacker.position = { x: 1, y: 1 };
        target.position = { x: 2, y: 1 };
        const state = createState([attacker, target]);

        const action = {
            type: 'BRAWL_ATTACK' as const,
            attackerId: 'Hero',
            targetId: 'Villain'
        };

        // Roll: Attacker 1, Target 6
        // Totals: Attacker (1+2)=3, Target (6+1)=7 -> Villain wins!
        // But Attacker rolled 1 (Fumble) -> extra hit on self
        // Villain rolled 6 (Crit) -> extra hit on Hero
        const result = reduceBattle(state, action, deps);
        
        // Expected: 3 rolls. 
        // 1: Attacker (1), 2: Target (6), 3: Damage (4) which kills Hero.
        // Subsequent hits on Hero are skipped because Hero is already a casualty.
        expect(result.next.rng.cursor).toBe(3); 
        expect(result.events.some(e => e.type === 'BRAWL_RESOLVED')).toBe(true);
        expect(result.next.battle.participants.find(p => p.id === 'Hero')?.status).toBe('casualty');
    });
});
