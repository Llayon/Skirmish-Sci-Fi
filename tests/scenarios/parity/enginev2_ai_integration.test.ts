import { describe, it, expect } from 'vitest';
import { EngineBattleState, EngineDeps } from '@/services/engine/battle/types';
import { reduceBattle } from '@/services/engine/battle/reduceBattle';
import { Battle, BattleParticipant } from '@/types';
import { ShootingWeapon } from '@/services/engine/battle/rules/shootingRules';

describe('AI Integration: PROCESS_AI_TURN', () => {
    const createParticipant = (id: string, pos: { x: number, y: number }, side: 'player' | 'enemy' = 'enemy'): BattleParticipant => ({
        id,
        name: id,
        position: pos,
        status: 'active',
        stats: { speed: 4, reactions: 3, combat: 3, toughness: 3, savvy: 3, aim: 0, luck: 0 },
        type: side === 'player' ? 'character' : 'enemy',
        ai: 'Aggressive',
        side,
        weapons: [{ id: 'teeth', range: 1, shots: 1, damage: 1, traits: [] } as ShootingWeapon],
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

    it('Scenario: Aggressive enemy charges and hits player automatically via PROCESS_AI_TURN', () => {
        const actor = createParticipant('Enemy', { x: 0, y: 0 }, 'enemy');
        const player = createParticipant('Player', { x: 2, y: 0 }, 'player');
        const state = createState([actor, player]);

        const action = {
            type: 'PROCESS_AI_TURN' as const,
            participantId: 'Enemy'
        };

        const result = reduceBattle(state, action, deps);

        // 1. Check movement
        const updatedActor = result.next.battle.participants.find(p => p.id === 'Enemy')!;
        expect(updatedActor.position).toEqual({ x: 1, y: 0 }); // Moved adjacent

        // 2. Check combat
        const updatedPlayer = result.next.battle.participants.find(p => p.id === 'Player')!;
        expect(updatedPlayer.status).toBe('casualty'); // Hit with 6 damage

        // 3. Check logs and events
        expect(result.events.some(e => e.type === 'PARTICIPANT_MOVED')).toBe(true);
        expect(result.events.some(e => e.type === 'BRAWL_RESOLVED')).toBe(true);
        expect(result.log.length).toBeGreaterThan(1);
    });
});
