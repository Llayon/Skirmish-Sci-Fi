import { describe, it, expect } from 'vitest';
import { hasLineOfSight as hasLoSV1 } from '@/services/gridUtils';
// @ts-ignore - function does not exist yet
import { hasLineOfSight as hasLoSV2 } from '@/services/engine/battle/rules/visibilityRules';
import { EngineBattleState } from '@/services/engine/battle/types';
import { Battle } from '@/types';

describe('Parity: Visibility (Line of Sight)', () => {
    const createState = (terrain: any[]): EngineBattleState => ({
        schemaVersion: 1,
        battle: {
            terrain,
            participants: [],
            gridSize: { width: 20, height: 20 }
        } as unknown as Battle,
        rng: { cursor: 0, seed: 123 }
    });

    it('Scenario 1: Clear line of sight across open ground', () => {
        const state = createState([]);
        const posA = { x: 2, y: 2 };
        const posB = { x: 5, y: 5 };

        const resV1 = hasLoSV1(posA, posB, state.battle.terrain);
        const resV2 = hasLoSV2(state, posA, posB);

        expect(resV1).toBe(true);
        expect(resV2).toBe(resV1);
    });

    it('Scenario 2: Wall blocking horizontal sight', () => {
        const terrain = [
            { type: 'Wall', position: { x: 5, y: 5 } }
        ];
        const state = createState(terrain);
        const posA = { x: 2, y: 5 };
        const posB = { x: 8, y: 5 };

        const resV1 = hasLoSV1(posA, posB, state.battle.terrain);
        const resV2 = hasLoSV2(state, posA, posB);

        expect(resV1).toBe(false);
        expect(resV2).toBe(resV1);
    });

    it('Scenario 3: Diagonal blocking wall', () => {
        const terrain = [
            { type: 'Wall', position: { x: 3, y: 3 } }
        ];
        const state = createState(terrain);
        const posA = { x: 2, y: 2 };
        const posB = { x: 4, y: 4 };

        const resV1 = hasLoSV1(posA, posB, state.battle.terrain);
        const resV2 = hasLoSV2(state, posA, posB);

        expect(resV1).toBe(false);
        expect(resV2).toBe(resV1);
    });
});
