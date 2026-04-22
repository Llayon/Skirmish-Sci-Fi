import { describe, it, expect } from 'vitest';
import { findBestTarget } from './targetingRules';
import { EngineBattleState, EngineDeps } from '../types';
import { Battle, BattleParticipant } from '@/types/battle';
import { ShootingWeapon } from './shootingRules';

describe('targetingRules: findBestTarget', () => {
    const createParticipant = (id: string, pos: { x: number, y: number }, side: 'player' | 'enemy' = 'player'): BattleParticipant => ({
        id,
        name: id,
        position: pos,
        status: 'active',
        stats: { speed: 4, reactions: 3, combat: 3, toughness: 3, savvy: 3, aim: 0, luck: 0 },
        type: side === 'player' ? 'character' : 'enemy',
        side,
        weapons: [{ id: 'pistol', range: 12, shots: 1, damage: 0, traits: [] } as ShootingWeapon],
        activeEffects: [],
        consumables: [],
        stunTokens: 0,
        actionsRemaining: 2,
        actionsTaken: { move: false, combat: false, dash: false, interact: false },
        currentLuck: 0,
        consumablesUsedThisTurn: 0,
        utilityDevices: []
    } as unknown as BattleParticipant);

    const createState = (participants: BattleParticipant[] = []): EngineBattleState => ({
        schemaVersion: 1,
        battle: {
            terrain: [],
            participants,
            gridSize: { width: 20, height: 20 }
        } as unknown as Battle,
        rng: { cursor: 0, seed: 123 }
    });

    it('Scenario 1: Chooses target with lowest TN (closest range bracket)', () => {
        const actor = createParticipant('Enemy', { x: 0, y: 0 }, 'enemy');
        const targetA = createParticipant('Far', { x: 10, y: 0 }, 'player'); // dist 10 -> TN 5
        const targetB = createParticipant('Near', { x: 5, y: 0 }, 'player'); // dist 5 -> TN 3
        const state = createState([actor, targetA, targetB]);

        const result = findBestTarget(state, actor.id, [targetA, targetB], {
            rng: { d100: (s) => ({ value: 50, next: s }) }
        } as EngineDeps);

        expect(result.targetId).toBe('Near');
    });

    it('Scenario 2: Chooses closest target when TNs are equal', () => {
        const actor = createParticipant('Enemy', { x: 0, y: 0 }, 'enemy');
        const targetA = createParticipant('Medium', { x: 6, y: 0 }, 'player'); // dist 6 -> TN 3
        const targetB = createParticipant('Near', { x: 3, y: 0 }, 'player'); // dist 3 -> TN 3
        const state = createState([actor, targetA, targetB]);

        const result = findBestTarget(state, actor.id, [targetA, targetB], {
            rng: { d100: (s) => ({ value: 50, next: s }) }
        } as EngineDeps);

        expect(result.targetId).toBe('Near');
    });

    it('Scenario 3: Breaks tie with RNG when TN and Distance are identical', () => {
        const actor = createParticipant('Enemy', { x: 0, y: 0 }, 'enemy');
        const targetA = createParticipant('Alpha', { x: 3, y: 0 }, 'player');
        const targetB = createParticipant('Beta', { x: 0, y: 3 }, 'player');
        const state = createState([actor, targetA, targetB]);

        const result = findBestTarget(state, actor.id, [targetA, targetB], {
            rng: { d100: (s) => ({ value: 75, next: { ...s, cursor: 1 } }) }
        } as EngineDeps);

        expect(result.targetId).toBe('Beta');
        expect(result.nextRng.cursor).toBe(1);
    });
});
