import { describe, it, expect } from 'vitest';
import { generateTerrain } from './generateTerrain';
import { reduceBattle } from '../reduceBattle';
import { EngineBattleState, BattleAction, CURRENT_ENGINE_SCHEMA_VERSION } from '../types';
import { createRng, createScriptedRngState, d6, d100 } from '../../rng/rng';
import { Battle } from '@/types/battle';

function createMockState(seed: number): EngineBattleState {
    return {
        schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
        battle: {
            id: 'battle-1',
            participants: [],
            terrain: [],
            mission: { type: 'Patrol' },
            round: 1,
            phase: 'quick_actions',
            gridSize: { width: 16, height: 16 },
            log: [],
        } as unknown as Battle,
        rng: createRng(seed),
    };
}

const baseAction = {
    type: 'GENERATE_TERRAIN' as const,
    theme: 'Industrial' as const,
    gridSize: { width: 32, height: 32 },
};

describe('generateTerrain action', () => {
    it('replaces battle.terrain with a generated layout', () => {
        const state = createMockState(12345);
        const { next, events, log } = generateTerrain(state, baseAction);

        expect(next.battle.terrain.length).toBeGreaterThan(0);
        expect(next.battle.gridSize).toEqual({ width: 32, height: 32 });
        expect(events).toHaveLength(1);
        expect(events[0]).toEqual({
            type: 'TERRAIN_GENERATED',
            theme: 'Industrial',
            pieceCount: next.battle.terrain.length,
        });
        expect(log[0].key).toBe('log.terrain.generated');
    });

    it('advances the engine RNG cursor', () => {
        const state = createMockState(12345);
        const { next } = generateTerrain(state, baseAction);

        expect('cursor' in next.rng).toBe(true);
        if ('cursor' in next.rng && 'cursor' in state.rng) {
            expect(next.rng.cursor).toBeGreaterThan(state.rng.cursor);
            expect(next.rng.seed).toBe(state.rng.seed);
        }
    });

    it('is deterministic: same seed produces identical terrain via reduceBattle', () => {
        const stateA = createMockState(12345);
        const stateB = createMockState(12345);
        const action: BattleAction = baseAction;

        const resultA = reduceBattle(stateA, action, { rng: { d6, d100 } });
        const resultB = reduceBattle(stateB, action, { rng: { d6, d100 } });

        expect(resultA.next.battle.terrain).toEqual(resultB.next.battle.terrain);
        expect(resultA.stateHash).toBe(resultB.stateHash);
    });

    it('different seeds produce different terrain', () => {
        const resultA = generateTerrain(createMockState(1), baseAction);
        const resultB = generateTerrain(createMockState(2), baseAction);

        expect(resultA.next.battle.terrain).not.toEqual(resultB.next.battle.terrain);
    });

    it('passes worldTraits through to the generator (crystals add Crystal pieces)', () => {
        const state = createMockState(4242);
        const action: BattleAction = {
            type: 'GENERATE_TERRAIN',
            theme: 'Wilderness',
            gridSize: { width: 32, height: 32 },
            worldTraits: [{ id: 'crystals', name: 'Crystals', description: '' } as unknown as NonNullable<Extract<BattleAction, { type: 'GENERATE_TERRAIN' }>['worldTraits']>[number]],
        };

        const { next } = generateTerrain(state, action);
        const crystalCount = next.battle.terrain.filter((t) => t.name === 'Crystal').length;
        expect(crystalCount).toBeGreaterThan(0);
    });

    it('throws when called with a scripted RNG state', () => {
        const state: EngineBattleState = {
            ...createMockState(0),
            rng: createScriptedRngState([{ die: 'd6', value: 3 }], 0),
        };

        expect(() => generateTerrain(state, baseAction)).toThrow(/scripted/i);
    });

    it('can produce modelPath and modelRef for Industrial theme (seed 1)', () => {
        const state = createMockState(1);
        const action: BattleAction = {
            type: 'GENERATE_TERRAIN',
            theme: 'Industrial',
            gridSize: { width: 32, height: 32 },
        };

        const { next } = generateTerrain(state, action);
        const withModelPath = next.battle.terrain.filter((t) => t.modelPath);
        const withModelRef = next.battle.terrain.filter((t) => t.modelRef);

        expect(withModelPath.length + withModelRef.length).toBeGreaterThan(0);
    });
});
