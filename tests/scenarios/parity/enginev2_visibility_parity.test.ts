import { describe, it, expect } from 'vitest';
import { hasLineOfSight as hasLoSV1 } from '@/services/rules/visibility';
import { hasLineOfSight as hasLoSV2 } from '@/services/engine/battle/rules/visibilityRules';
import { EngineBattleState } from '@/services/engine/battle/types';
import { Battle, BattleParticipant } from '@/types';

describe('Parity: Visibility (Line of Sight)', () => {
    const createParticipant = (id: string, pos: { x: number, y: number }): BattleParticipant => ({
        id,
        name: id,
        position: pos,
        status: 'active',
        stats: { speed: 4, reactions: 3, combat: 3, toughness: 3, savvy: 3, aim: 0 },
        type: 'character',
        consumables: [],
        activeEffects: [],
        stunTokens: 0,
        actionsRemaining: 2,
        actionsTaken: { move: false, combat: false, dash: false, interact: false },
        weapons: []
    } as BattleParticipant);

    const createState = (terrain: any[]): EngineBattleState => ({
        schemaVersion: 1,
        battle: {
            terrain,
            participants: [],
            gridSize: { width: 20, height: 20 },
            log: []
        } as unknown as Battle,
        rng: { cursor: 0, seed: 123 }
    });

    it('Scenario 1: Clear line of sight across open ground', () => {
        const state = createState([]);
        const pA = createParticipant('A', { x: 2, y: 2 });
        const pB = createParticipant('B', { x: 5, y: 5 });

        const resV1 = hasLoSV1(pA, pB, state.battle);
        const resV2 = hasLoSV2(state, pA.position, pB.position);

        expect(resV1).toBe(true);
        expect(resV2).toBe(resV1);
    });

    it('Scenario 2: Wall blocking horizontal sight', () => {
        const terrain = [
            { 
                id: 'w1', 
                type: 'Wall', 
                position: { x: 5, y: 5 }, 
                size: { width: 1, height: 1 }, 
                blocksLineOfSight: true 
            }
        ];
        const state = createState(terrain);
        const pA = createParticipant('A', { x: 2, y: 5 });
        const pB = createParticipant('B', { x: 8, y: 5 });

        const resV1 = hasLoSV1(pA, pB, state.battle);
        const resV2 = hasLoSV2(state, pA.position, pB.position);

        expect(resV1).toBe(false);
        expect(resV2).toBe(resV1);
    });

    it('Scenario 3: Diagonal blocking wall', () => {
        const terrain = [
            { 
                id: 'w1', 
                type: 'Wall', 
                position: { x: 3, y: 3 }, 
                size: { width: 1, height: 1 }, 
                blocksLineOfSight: true 
            }
        ];
        const state = createState(terrain);
        const pA = createParticipant('A', { x: 2, y: 2 });
        const pB = createParticipant('B', { x: 4, y: 4 });

        const resV1 = hasLoSV1(pA, pB, state.battle);
        const resV2 = hasLoSV2(state, pA.position, pB.position);

        expect(resV1).toBe(false);
        expect(resV2).toBe(resV1);
    });

    it('Scenario 4: Closed door blocks sight', () => {
        const terrain = [
            { 
                id: 'd1', 
                type: 'Door', 
                position: { x: 5, y: 5 }, 
                size: { width: 1, height: 1 }, 
                blocksLineOfSight: true,
                status: 'closed'
            } as any
        ];
        const state = createState(terrain);
        const pA = createParticipant('A', { x: 2, y: 5 });
        const pB = createParticipant('B', { x: 8, y: 5 });

        const resV1 = hasLoSV1(pA, pB, state.battle);
        const resV2 = hasLoSV2(state, pA.position, pB.position);

        expect(resV1).toBe(false);
        expect(resV2).toBe(resV1);
    });

    it('Scenario 5: Open door allows sight', () => {
        const terrain = [
            { 
                id: 'd1', 
                type: 'Door', 
                position: { x: 5, y: 5 }, 
                size: { width: 1, height: 1 }, 
                blocksLineOfSight: false,
                status: 'open'
            } as any
        ];
        const state = createState(terrain);
        const pA = createParticipant('A', { x: 2, y: 5 });
        const pB = createParticipant('B', { x: 8, y: 5 });

        const resV1 = hasLoSV1(pA, pB, state.battle);
        const resV2 = hasLoSV2(state, pA.position, pB.position);

        expect(resV1).toBe(true);
        expect(resV2).toBe(resV1);
    });

    it('Scenario 6: Multi-cell block (2x2) blocking sight', () => {
        const terrain = [
            { 
                id: 'b1', 
                type: 'Block', 
                position: { x: 4, y: 4 }, 
                size: { width: 2, height: 2 }, 
                blocksLineOfSight: true 
            } as any
        ];
        const state = createState(terrain);
        const pA = createParticipant('A', { x: 2, y: 5 });
        const pB = createParticipant('B', { x: 8, y: 5 });

        const resV1 = hasLoSV1(pA, pB, state.battle);
        const resV2 = hasLoSV2(state, pA.position, pB.position);

        expect(resV1).toBe(false);
        expect(resV2).toBe(resV1);
    });
});
