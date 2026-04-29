import { describe, it, expect } from 'vitest';
import { generateTacticalAIPlan } from './tacticalAI';
import { EngineBattleState, EngineDeps } from '../types';
import { Battle, BattleParticipant, Terrain } from '@/types';
import { ShootingWeapon } from '../rules/shootingRules';

describe('tacticalAI: generateTacticalAIPlan', () => {
    const createParticipant = (id: string, pos: { x: number, y: number }, side: 'player' | 'enemy' = 'enemy'): BattleParticipant => ({
        id,
        name: id,
        position: pos,
        status: 'active',
        stats: { speed: 4, reactions: 3, combat: 3, toughness: 3, savvy: 3, aim: 0, luck: 0 },
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

    const createState = (participants: BattleParticipant[], terrain: Terrain[] = []): EngineBattleState => ({
        schemaVersion: 1,
        battle: {
            terrain,
            participants,
            gridSize: { width: 20, height: 20 }
        } as unknown as Battle,
        rng: { cursor: 0, seed: 123 }
    });

    const deps: EngineDeps = {
        rng: {
            d6: (s) => ({ value: 1, next: s }),
            d100: (s) => ({ value: 50, next: s })
        }
    } as EngineDeps;

    it('Regression: Tactical AI moves and shoots', () => {
        const actor = createParticipant('Soldier', { x: 5, y: 5 }, 'enemy');
        const player = createParticipant('Player', { x: 10, y: 5 }, 'player');
        // No walls, just clear field
        const state = createState([actor, player], []);

        const { actions } = generateTacticalAIPlan(state, actor.id, deps);

        expect(actions.some(a => a.type === 'MOVE_PARTICIPANT')).toBe(true);
        expect(actions.some(a => a.type === 'SHOOT_ATTACK')).toBe(true);
    });
});
