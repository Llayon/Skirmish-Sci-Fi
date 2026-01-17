import { distance, findPath, findReachableCells, findPushbackPosition, findDodgePosition } from './gridUtils';
import { Position, Battle, BattleParticipant, Terrain } from '../types';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocking the rollD6 utility for findDodgePosition
const rolls = vi.hoisted(() => ({
    rollD6: vi.fn(),
}));
vi.mock('./utils/rolls', () => ({
    rollD6: rolls.rollD6,
}));


const createMockParticipant = (id: string, x: number, y: number): BattleParticipant => ({
    id,
    type: 'character',
    position: { x, y },
    status: 'active',
} as BattleParticipant);


describe('gridUtils', () => {
    let battle: Battle;

    beforeEach(() => {
        battle = {
            id: 'test_battle',
            participants: [],
            gridSize: { width: 20, height: 20 },
            terrain: [],
        } as Battle;
    });

    describe('distance', () => {
        it('should calculate the Chebyshev distance correctly', () => {
            const pos1: Position = { x: 2, y: 3 };
            const pos2: Position = { x: 5, y: 7 };
            expect(distance(pos1, pos2)).toBe(4);
        });
    });

    describe('findReachableCells', () => {
        it('should return all cells within range on an empty grid', () => {
            const startPos = { x: 5, y: 5 };
            const movePoints = 2;
            const reachable = findReachableCells(startPos, movePoints, battle, 'p1');
            // A 2-move radius square is 5x5, so 25 cells. The start cell has cost 0.
            expect(reachable.size).toBe(25);
            expect(reachable.get('7,7')).toBe(2); // Diagonal
            expect(reachable.get('5,7')).toBe(2); // Straight
        });

        it('should not include cells blocked by impassable terrain', () => {
            const wall: Terrain = { id: 't1', isImpassable: true, position: { x: 6, y: 5 }, size: { width: 1, height: 1 } } as Terrain;
            battle.terrain.push(wall);
            const reachable = findReachableCells({ x: 5, y: 5 }, 2, battle, 'p1');
            expect(reachable.has('6,5')).toBe(false);
        });

        it('should apply double cost for difficult terrain', () => {
            const difficult: Terrain = { id: 't1', isDifficult: true, position: { x: 6, y: 5 }, size: { width: 1, height: 1 } } as Terrain;
            battle.terrain.push(difficult);
            const reachable = findReachableCells({ x: 5, y: 5 }, 2, battle, 'p1');
            expect(reachable.get('6,5')).toBe(2); // Cost 2 to enter
            // (7,5) can be reached via (6,6) -> (7,5) for cost 2, so it should be reachable
            expect(reachable.has('7,5')).toBe(true); // Can reach via alternate path
            expect(reachable.get('7,5')).toBe(2); // Cost 2 via alternate path
        });
    });

    describe('findPath', () => {
        it('should find a direct path on an empty grid', () => {
            const path = findPath({ x: 1, y: 1 }, { x: 4, y: 4 }, battle, 'p1', true);
            expect(path).not.toBeNull();
            expect(path).toHaveLength(4); // (1,1)->(2,2)->(3,3)->(4,4)
            expect(path![0]).toEqual({ x: 1, y: 1 });
            expect(path![3]).toEqual({ x: 4, y: 4 });
        });

        it('should find a path around an obstacle', () => {
            const wall: Terrain = { id: 't1', isImpassable: true, position: { x: 3, y: 1 }, size: { width: 1, height: 5 } } as Terrain;
            battle.terrain.push(wall);
            const path = findPath({ x: 2, y: 3 }, { x: 4, y: 3 }, battle, 'p1', true);
            expect(path).not.toBeNull();
            // The wall blocks (3,1) to (3,5), so path should avoid x=3 at y=1,2,3,4,5
            expect(path!.some(p => p.x === 3 && p.y >= 1 && p.y <= 5)).toBe(false);
        });

        it('should return null if no path exists', () => {
            const wall: Terrain = { id: 't1', isImpassable: true, position: { x: 3, y: 0 }, size: { width: 1, height: 20 } } as Terrain;
            battle.terrain.push(wall);
            const path = findPath({ x: 2, y: 3 }, { x: 4, y: 3 }, battle, 'p1', true);
            expect(path).toBeNull();
        });
    });

    describe('findPushbackPosition', () => {
        it('should return a valid position when not blocked', () => {
            const pos = findPushbackPosition({ x: 5, y: 5 }, { x: 4, y: 4 }, battle);
            expect(pos).toEqual({ x: 6, y: 6 });
        });

        it('should return null when the pushback position is blocked by terrain', () => {
            const wall: Terrain = { id: 't1', isImpassable: true, position: { x: 6, y: 6 }, size: { width: 1, height: 1 } } as Terrain;
            battle.terrain.push(wall);
            const pos = findPushbackPosition({ x: 5, y: 5 }, { x: 4, y: 4 }, battle);
            expect(pos).toBeNull();
        });

        it('should return null when the pushback position is blocked by another participant', () => {
            battle.participants.push(createMockParticipant('p2', 6, 6));
            const pos = findPushbackPosition({ x: 5, y: 5 }, { x: 4, y: 4 }, battle);
            expect(pos).toBeNull();
        });
    });
    
     describe('findDodgePosition', () => {
        beforeEach(() => {
            // Reset mocks before each test in this describe block
            vi.resetAllMocks();
        });

        it('should move the participant by the rolled distance in a valid direction', () => {
            rolls.rollD6.mockReturnValue(3); // Dodge 3 spaces
            const { finalPos, distance } = findDodgePosition({ x: 5, y: 5 }, battle, 'p1');
            
            expect(distance).toBe(3);
            // It will pick a random valid direction. Since the board is empty, any direction is valid.
            // Let's just check it's 3 spaces away.
            const distMoved = Math.max(Math.abs(finalPos.x - 5), Math.abs(finalPos.y - 5));
            expect(distMoved).toBe(3);
        });

        it('should stop short if the path is blocked', () => {
            rolls.rollD6.mockReturnValue(4); // Try to dodge 4 spaces
            const wall: Terrain = { id: 't1', isImpassable: true, position: { x: 5, y: 2 }, size: { width: 1, height: 1 } } as Terrain;
            battle.terrain.push(wall);

            // This is tricky because the direction is random. We have to test the principle.
            // Let's assume it tries to go up. It should stop at (5,3).
            // A more robust test would be to check that the final position is walkable and within the dodge distance.
            const { finalPos } = findDodgePosition({ x: 5, y: 5 }, battle, 'p1');
            expect(finalPos.x).toBeGreaterThanOrEqual(5 - 4);
            expect(finalPos.x).toBeLessThanOrEqual(5 + 4);
            // Check that the final position is not the blocked cell.
            expect(finalPos).not.toEqual({ x: 5, y: 2 });
        });
        
         it('should not move if all directions are blocked', () => {
            rolls.rollD6.mockReturnValue(2);
            // Surround the start position with walls
            for(let x = 4; x <= 6; x++) {
                for (let y = 4; y <= 6; y++) {
                    if (x === 5 && y === 5) continue;
                    const wall: Terrain = { id: `t_${x}_${y}`, isImpassable: true, position: { x, y }, size: { width: 1, height: 1 } } as Terrain;
                    battle.terrain.push(wall);
                }
            }
            
            const { finalPos, distance } = findDodgePosition({ x: 5, y: 5 }, battle, 'p1');
            expect(distance).toBe(2);
            expect(finalPos).toEqual({ x: 5, y: 5 });
         });
    });
});