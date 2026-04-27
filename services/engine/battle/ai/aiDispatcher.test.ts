import { describe, it, expect } from 'vitest';
import { generateAIPlan } from './aiDispatcher';
import { d6, d100 } from '../../rng/rng';
import { CURRENT_ENGINE_SCHEMA_VERSION, type EngineBattleState, type EngineDeps } from '../types';
import { createMinimalBattle, createTestCharacter, createTestEnemy } from '@/tests/fixtures/battleFixtures';
import type { Terrain } from '@/types/battle';

const deps: EngineDeps = { rng: { d6, d100 } };

const plateauAt = (x: number, y: number, w: number, h: number, baseElevation: number): Terrain => ({
    id: `plateau_${x}_${y}_${baseElevation}`,
    name: 'Plateau',
    type: 'Area',
    position: { x, y },
    size: { width: w, height: h },
    isDifficult: false,
    providesCover: false,
    blocksLineOfSight: false,
    isImpassable: false,
    baseElevation,
    objectHeight: 0,
});

describe('aiDispatcher: stranded-on-elevation fallback', () => {
    it('plans JUMP_DOWN when on a plateau with no walkable path to any enemy', () => {
        // Plateau at (0..0, 0..0) elevation 4. Enemy AI sits on it. Player
        // at (5,5). Pathfinding can't find a route (descent > 1 forbidden).
        const enemy = createTestEnemy({ id: 'e1', position: { x: 0, y: 0 } });
        enemy.side = 'enemy';
        enemy.ai = 'Aggressive';
        const player = createTestCharacter({ id: 'p1', position: { x: 5, y: 5 } });
        player.side = 'player';

        const battle = createMinimalBattle({
            participants: [enemy, player],
            terrain: [plateauAt(0, 0, 1, 1, 4)],
        });
        const state: EngineBattleState = {
            schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
            battle,
            rng: { cursor: 0, seed: 1 },
        };

        const { actions } = generateAIPlan(state, 'e1', deps);
        expect(actions).toHaveLength(1);
        expect(actions[0].type).toBe('JUMP_DOWN');
        expect((actions[0] as { type: 'JUMP_DOWN'; to: { x: number; y: number } }).to).toBeDefined();
    });

    it('does NOT plan JUMP_DOWN when ground-level path exists', () => {
        // Same scene minus the plateau — actor is on flat ground, normal AI fires.
        const enemy = createTestEnemy({ id: 'e1', position: { x: 0, y: 0 } });
        enemy.side = 'enemy';
        enemy.ai = 'Aggressive';
        const player = createTestCharacter({ id: 'p1', position: { x: 5, y: 5 } });
        player.side = 'player';

        const battle = createMinimalBattle({ participants: [enemy, player] });
        const state: EngineBattleState = {
            schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
            battle,
            rng: { cursor: 0, seed: 1 },
        };

        const { actions } = generateAIPlan(state, 'e1', deps);
        // Aggressive AI from ground level will move/shoot; the first action
        // is never JUMP_DOWN.
        expect(actions[0]?.type).not.toBe('JUMP_DOWN');
    });

    it('does NOT plan JUMP_DOWN when on a plateau but has walkable path', () => {
        // Plateau big enough that the actor and a roof-bridge connect to a
        // ground-level cell at the same elevation level (descent ≤ 1).
        // Here: 2x2 plateau at elevation 1; enemy at (0,0), player at (3,0).
        // From plateau (0,0), the actor can step to (2,0) which is z=0 (drop 1, allowed).
        const enemy = createTestEnemy({ id: 'e1', position: { x: 0, y: 0 } });
        enemy.side = 'enemy';
        enemy.ai = 'Aggressive';
        const player = createTestCharacter({ id: 'p1', position: { x: 3, y: 0 } });
        player.side = 'player';

        const battle = createMinimalBattle({
            participants: [enemy, player],
            terrain: [plateauAt(0, 0, 2, 1, 1)],
        });
        const state: EngineBattleState = {
            schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
            battle,
            rng: { cursor: 0, seed: 1 },
        };

        const { actions } = generateAIPlan(state, 'e1', deps);
        expect(actions[0]?.type).not.toBe('JUMP_DOWN');
    });

    it('does NOT plan JUMP_DOWN when no jump-down target is available', () => {
        // Actor on a plateau but every adjacent cell is blocked by walls.
        const enemy = createTestEnemy({ id: 'e1', position: { x: 1, y: 1 } });
        enemy.side = 'enemy';
        enemy.ai = 'Aggressive';
        const player = createTestCharacter({ id: 'p1', position: { x: 5, y: 5 } });
        player.side = 'player';

        const wallAt = (x: number, y: number): Terrain => ({
            id: `w_${x}_${y}`,
            name: 'Wall',
            type: 'Block',
            position: { x, y },
            size: { width: 1, height: 1 },
            isDifficult: false,
            providesCover: true,
            blocksLineOfSight: true,
            isImpassable: true,
            baseElevation: 0,
            objectHeight: 2,
        });
        const walls: Terrain[] = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                walls.push(wallAt(1 + dx, 1 + dy));
            }
        }

        const battle = createMinimalBattle({
            participants: [enemy, player],
            terrain: [plateauAt(1, 1, 1, 1, 4), ...walls],
        });
        const state: EngineBattleState = {
            schemaVersion: CURRENT_ENGINE_SCHEMA_VERSION,
            battle,
            rng: { cursor: 0, seed: 1 },
        };

        const { actions } = generateAIPlan(state, 'e1', deps);
        // No JUMP target — fallback is silent and the AI plan goes through
        // its normal path (which produces an empty plan or shoot-only).
        expect(actions.find(a => a.type === 'JUMP_DOWN')).toBeUndefined();
    });
});
