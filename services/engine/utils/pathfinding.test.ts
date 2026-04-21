import { describe, it, expect } from 'vitest';
import { getShortestPath } from './pathfinding';
import { EngineBattleState } from '../battle/types';
import { Battle } from '@/types/battle';

describe('pathfinding: getShortestPath', () => {
    const createState = (terrain: any[] = []): EngineBattleState => ({
        schemaVersion: 1,
        battle: {
            terrain,
            gridSize: { width: 10, height: 10 }
        } as unknown as Battle,
        rng: { cursor: 0, seed: 123 }
    });

    it('Scenario 1: Clear straight path', () => {
        const state = createState();
        const path = getShortestPath(state, { x: 0, y: 0 }, { x: 2, y: 0 });
        expect(path).toEqual([{ x: 1, y: 0 }, { x: 2, y: 0 }]);
    });

    it('Scenario 2: Navigate around a wall', () => {
        // Wall at (1,0) and (1,1)
        const terrain = [
            { type: 'Wall', position: { x: 1, y: 0 }, size: { width: 1, height: 1 }, isImpassable: true },
            { type: 'Wall', position: { x: 1, y: 1 }, size: { width: 1, height: 1 }, isImpassable: true }
        ];
        const state = createState(terrain);
        const path = getShortestPath(state, { x: 0, y: 0 }, { x: 2, y: 0 });
        
        // Path should go around the wall (e.g., through y=2 or similar)
        expect(path).toBeDefined();
        path?.forEach(p => {
            const isWall = terrain.some(t => t.position.x === p.x && t.position.y === p.y);
            expect(isWall).toBe(false);
        });
        expect(path?.[path.length - 1]).toEqual({ x: 2, y: 0 });
    });

    it('Scenario 3: Prefer easy terrain over difficult terrain', () => {
        // Difficult terrain at (1,0)
        const terrain = [
            { type: 'Area', position: { x: 1, y: 0 }, size: { width: 1, height: 1 }, isDifficult: true }
        ];
        const state = createState(terrain);
        
        // From (0,0) to (2,0). 
        // Option A: (0,0)->(1,0)[cost 2]->(2,0) Total cost 3
        // Option B: (0,0)->(1,1)[cost 1]->(2,0) Total cost 2
        const path = getShortestPath(state, { x: 0, y: 0 }, { x: 2, y: 0 });
        
        expect(path).toContainEqual({ x: 1, y: 1 });
        expect(path).not.toContainEqual({ x: 1, y: 0 });
    });
});
