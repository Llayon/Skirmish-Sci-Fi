import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hasLineOfSight as hasLoSV1 } from '@/services/rules/visibility';
import { hasLineOfSight as hasLoSV2 } from '@/services/engine/battle/rules/visibilityRules';
import { EngineBattleState } from '@/services/engine/battle/types';
import { Battle, BattleParticipant, Terrain } from '@/types';

describe('Parity: Visibility (Line of Sight)', () => {
    const createParticipant = (id: string, pos: { x: number, y: number }, side: 'player' | 'enemy' = 'player'): BattleParticipant => ({
        id,
        name: id,
        position: pos,
        status: 'active',
        stats: { speed: 4, reactions: 3, combat: 3, toughness: 3, savvy: 3, aim: 0, luck: 0 },
        type: side === 'player' ? 'character' : 'enemy',
        side,
        consumables: [],
        activeEffects: [],
        stunTokens: 0,
        actionsRemaining: 2,
        actionsTaken: { move: false, combat: false, dash: false, interact: false },
        weapons: [],
        currentLuck: 0,
        consumablesUsedThisTurn: 0,
        utilityDevices: []
    } as unknown as BattleParticipant);

    const createState = (terrain: Terrain[]): EngineBattleState => ({
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
        const terrain: Terrain[] = [
            {
                id: 'w1',
                name: 'Wall',
                type: 'Wall',
                position: { x: 5, y: 5 },
                size: { width: 1, height: 1 },
                blocksLineOfSight: true,
                isDifficult: false,
                providesCover: true,
                isImpassable: true,
                baseElevation: 0,
                objectHeight: 2,
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
        const terrain: Terrain[] = [
            {
                id: 'w1',
                name: 'Wall',
                type: 'Wall',
                position: { x: 3, y: 3 },
                size: { width: 1, height: 1 },
                blocksLineOfSight: true,
                isDifficult: false,
                providesCover: true,
                isImpassable: true,
                baseElevation: 0,
                objectHeight: 2,
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
        const terrain: Terrain[] = [
            {
                id: 'd1',
                name: 'Door',
                type: 'Door',
                position: { x: 5, y: 5 },
                size: { width: 1, height: 1 },
                blocksLineOfSight: true,
                status: 'closed',
                isDifficult: false,
                providesCover: false,
                isImpassable: true,
                baseElevation: 0,
                objectHeight: 0,
                losBlockerHeight: 2,
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
        const terrain: Terrain[] = [
            { 
                id: 'd1', 
                name: 'Door',
                type: 'Door', 
                position: { x: 5, y: 5 }, 
                size: { width: 1, height: 1 }, 
                blocksLineOfSight: false,
                status: 'open',
                isDifficult: false,
                providesCover: false,
                isImpassable: false
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
        const terrain: Terrain[] = [
            {
                id: 'b1',
                name: 'Block',
                type: 'Block',
                position: { x: 4, y: 4 },
                size: { width: 2, height: 2 },
                blocksLineOfSight: true,
                isDifficult: false,
                providesCover: true,
                isImpassable: true,
                baseElevation: 0,
                objectHeight: 2,
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
