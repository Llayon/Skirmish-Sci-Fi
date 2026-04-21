import { describe, it, expect } from 'vitest';
// @ts-ignore - will be created in Task 2
import { findBestTarget } from './targetingRules';
import { EngineBattleState } from '../types';
import { Battle, BattleParticipant } from '@/types/battle';

describe('targetingRules: findBestTarget', () => {
    const createParticipant = (id: string, pos: { x: number, y: number }): BattleParticipant => ({
        id,
        name: id,
        position: pos,
        status: 'active',
        stats: { speed: 4, reactions: 3, combat: 3, toughness: 3, savvy: 3, aim: 0 },
        type: 'character',
        weapons: [{ id: 'pistol', range: 12, shots: 1, damage: 0, traits: [] }] as any
    } as BattleParticipant);

    const createState = (): EngineBattleState => ({
        schemaVersion: 1,
        battle: {
            terrain: [],
            participants: [],
            gridSize: { width: 20, height: 20 }
        } as unknown as Battle,
        rng: { cursor: 0, seed: 123 }
    });

    it('Scenario 1: Chooses target with lowest TN (closest range bracket)', () => {
        const state = createState();
        const actor = createParticipant('Enemy', { x: 0, y: 0 });
        const targetA = createParticipant('Far', { x: 10, y: 0 }); // dist 10 -> TN 5
        const targetB = createParticipant('Near', { x: 5, y: 0 }); // dist 5 -> TN 3

        const result = findBestTarget(state, actor.id, [targetA, targetB], {
            rng: { d100: (s: any) => ({ value: 50, next: s }) }
        } as any);

        expect(result.targetId).toBe('Near');
    });

    it('Scenario 2: Chooses closest target when TNs are equal', () => {
        const state = createState();
        const actor = createParticipant('Enemy', { x: 0, y: 0 });
        const targetA = createParticipant('Medium', { x: 6, y: 0 }); // dist 6 -> TN 3
        const targetB = createParticipant('Near', { x: 3, y: 0 }); // dist 3 -> TN 3

        const result = findBestTarget(state, actor.id, [targetA, targetB], {
            rng: { d100: (s: any) => ({ value: 50, next: s }) }
        } as any);

        expect(result.targetId).toBe('Near');
    });

    it('Scenario 3: Breaks tie with RNG when TN and Distance are identical', () => {
        const state = createState();
        const actor = createParticipant('Enemy', { x: 0, y: 0 });
        const targetA = createParticipant('Alpha', { x: 3, y: 0 });
        const targetB = createParticipant('Beta', { x: 0, y: 3 });
        // Both dist 3, both TN 3

        // Mock RNG to pick second target (val > 50)
        const result = findBestTarget(state, actor.id, [targetA, targetB], {
            rng: { d100: (s: any) => ({ value: 75, next: { ...s, cursor: 1 } }) }
        } as any);

        expect(result.targetId).toBe('Beta');
        expect(result.nextRng.cursor).toBe(1);
    });
});
