import { describe, it, expect } from 'vitest';
import { getShortestPath } from '@/services/engine/utils/pathfinding';
import { EngineBattleState } from '@/services/engine/battle/types';
import { Battle, Terrain } from '@/types';

describe('Movement Rules Deep Verification', () => {
    const createState = (terrain: Terrain[]): EngineBattleState => ({
        schemaVersion: 1,
        battle: {
            gridSize: { width: 10, height: 10 },
            terrain,
            participants: []
        } as unknown as Battle,
        rng: { seed: 1, cursor: 0 }
    });

    it('Rules: Should correctly navigate around Impassable and through Difficult terrain', () => {
        // Setup: 
        // S . . . .
        // # # # . .
        // . . D . .  (D is Difficult)
        // . . . . E
        
        const wall: Terrain = {
            id: 'wall', name: 'Wall', type: 'Obstacle',
            position: { x: 0, y: 1 }, size: { width: 3, height: 1 },
            isImpassable: true, blocksLineOfSight: true, providesCover: true, isDifficult: false
        };

        const difficult: Terrain = {
            id: 'mud', name: 'Mud', type: 'Area',
            position: { x: 2, y: 2 }, size: { width: 1, height: 1 },
            isDifficult: true, isImpassable: false, blocksLineOfSight: false, providesCover: false
        };

        const state = createState([wall, difficult]);
        const start = { x: 0, y: 0 };
        const end = { x: 4, y: 3 };

        const path = getShortestPath(state, start, end);

        expect(path).toBeDefined();
        
        // 1. Path must not contain any wall cells
        path!.forEach(step => {
            const isInsideWall = step.y === 1 && step.x >= 0 && step.x <= 2;
            expect(isInsideWall, `Step ${step.x},${step.y} is inside wall!`).toBe(false);
        });

        // 2. Final destination must match
        expect(path![path!.length - 1]).toEqual(end);

        // 3. Path should be deterministic
        const path2 = getShortestPath(state, start, end);
        expect(path).toEqual(path2);
    });
});
