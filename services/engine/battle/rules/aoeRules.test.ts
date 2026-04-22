import { describe, it, expect } from 'vitest';
import { getParticipantsInRadius } from './aoeRules';
import { EngineBattleState } from '../types';
import { Battle, BattleParticipant } from '@/types';

describe('aoeRules: getParticipantsInRadius', () => {
    const createParticipant = (id: string, pos: { x: number, y: number }, side: 'player' | 'enemy' = 'player', status: BattleParticipant['status'] = 'active'): BattleParticipant => ({
        id,
        name: id,
        position: pos,
        status,
        stats: { speed: 4, reactions: 3, combat: 3, toughness: 3, savvy: 3, aim: 0, luck: 0 },
        type: side === 'player' ? 'character' : 'enemy',
        side,
        weapons: [],
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
            gridSize: { width: 20, height: 20 },
            terrain: []
        } as unknown as Battle,
        rng: { cursor: 0, seed: 123 }
    });

    it('Scenario 1: Identifies all participants in radius', () => {
        const p1 = createParticipant('p1', { x: 5, y: 5 });
        const p2 = createParticipant('p2', { x: 7, y: 5 }); // dist 2
        const p3 = createParticipant('p3', { x: 8, y: 5 }); // dist 3 (Out)
        const state = createState([p1, p2, p3]);

        const res = getParticipantsInRadius(state, { x: 5, y: 5 }, 2);
        
        expect(res).toHaveLength(2);
        expect(res.map(p => p.id)).toContain('p1');
        expect(res.map(p => p.id)).toContain('p2');
    });

    it('Scenario 2: Excludes casualties', () => {
        const p1 = createParticipant('p1', { x: 5, y: 5 }, 'player', 'casualty');
        const state = createState([p1]);

        const res = getParticipantsInRadius(state, { x: 5, y: 5 }, 2);
        expect(res).toHaveLength(0);
    });

    it('Scenario 3: Returns participants sorted by ID', () => {
        const pB = createParticipant('beta', { x: 5, y: 5 });
        const pA = createParticipant('alpha', { x: 6, y: 5 });
        const state = createState([pB, pA]);

        const res = getParticipantsInRadius(state, { x: 5, y: 5 }, 2);
        
        expect(res[0].id).toBe('alpha');
        expect(res[1].id).toBe('beta');
    });
});
