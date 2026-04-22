import { describe, it, expect } from 'vitest';
import { EngineBattleState, EngineDeps } from '@/services/engine/battle/types';
import { reduceBattle } from '@/services/engine/battle/reduceBattle';
import { Battle, BattleParticipant } from '@/types';

describe('AoE Parity: Grenade Clusters', () => {
    const createParticipant = (id: string, pos: { x: number, y: number }): BattleParticipant => ({
        id,
        name: id,
        position: pos,
        status: 'active',
        stats: { speed: 4, reactions: 3, combat: 3, toughness: 3, savvy: 3, aim: 0 },
        type: 'character',
        weapons: [],
        activeEffects: [],
        consumables: [],
        stunTokens: 0,
        actionsRemaining: 2,
        actionsTaken: { move: false, combat: false, dash: false, interact: false }
    } as any);

    const createState = (participants: BattleParticipant[]): EngineBattleState => ({
        schemaVersion: 1,
        battle: {
            terrain: [],
            participants,
            gridSize: { width: 20, height: 20 }
        } as unknown as Battle,
        rng: { cursor: 0, seed: 123 }
    });

    const deps: EngineDeps = {
        rng: {
            d6: (s) => ({ value: 6, next: { ...s, cursor: s.cursor + 1 } }), 
            d100: (s) => ({ value: 50, next: { ...s, cursor: s.cursor + 1 } })
        }
    };

    it('Scenario: Grenade hits a cluster of 3 enemies with accuracy checks', () => {
        const attacker = createParticipant('Hero', { x: 8, y: 8 }); // Move Hero closer
        const t1 = createParticipant('Enemy1', { x: 10, y: 10 }); 
        const t2 = createParticipant('Enemy2', { x: 11, y: 10 }); 
        const t3 = createParticipant('Enemy3', { x: 10, y: 11 }); 
        const state = createState([attacker, t1, t2, t3]);

        const action = {
            type: 'THROW_GRENADE' as const,
            attackerId: 'Hero',
            targetPos: { x: 10, y: 10 },
            weapon: { id: 'frag_grenade', range: 10, damage: 1, radius: 1 }
        };

        const result = reduceBattle(state, action, deps);

        // Analysis:
        // Hero at (8,8), Target at (10,10). Dist = 2. 
        // 2 <= Range 10. TN = 3 (dist <= 6).
        // Hit: 6 + 3 = 9. 9 >= 3. (Success).
        
        // Expected cursor = 6 (3 hits, 3 damage rolls).
        expect(result.next.rng.cursor).toBe(6);
        expect(result.next.battle.participants.filter(p => p.status === 'casualty')).toHaveLength(3);
    });
});
