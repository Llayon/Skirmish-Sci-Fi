import { Position } from '@/types/character';
import { EngineBattleState } from '../battle/types';
import { getFigureZ } from '../battle/rules/goodShotRules';
import { isPointInTerrain } from './terrain';

/**
 * Calculates the cost and walkability of a cell.
 */
function getCellCost(state: EngineBattleState, pos: Position): { walkable: boolean; cost: number } {
    const { battle } = state;
    
    // Bounds check
    if (pos.x < 0 || pos.x >= battle.gridSize.width || pos.y < 0 || pos.y >= battle.gridSize.height) {
        return { walkable: false, cost: 999 };
    }

    const terrains = battle.terrain.filter(t => isPointInTerrain(pos, t));
    
    if (terrains.some(t => t.isImpassable)) {
        return { walkable: false, cost: 999 };
    }

    const cost = terrains.some(t => t.isDifficult) ? 2 : 1;
    return { walkable: true, cost };
}

/**
 * Vertical movement cost for crossing from one walkable cell to another,
 * per Five Parsecs rulebook "Moving Up and Down":
 *
 *   Climbing UP: pay the height of the obstacle (Δz units).
 *   Descent of 1" or less: free.
 *   Descent greater than 1": NOT traversable by walking — requires the
 *     JUMP_DOWN action (with its own fall-damage check). Pathfinding
 *     refuses these edges by returning null so the caller skips them.
 *
 * Pure: depends only on terrain heights at the two cells.
 */
function getElevationCost(state: EngineBattleState, from: Position, to: Position): number | null {
    const dz = getFigureZ(state, to) - getFigureZ(state, from);
    if (dz > 0) return dz;            // climb up
    if (dz < -1) return null;          // descent > 1: must JUMP_DOWN, not walk
    return 0;                          // descent of 1 or less: free
}

/**
 * Finds the shortest path between two points using A*.
 */
export function getShortestPath(
    state: EngineBattleState,
    from: Position,
    to: Position
): Position[] | null {
    if (from.x === to.x && from.y === to.y) return [];

    const openSet: Position[] = [from];
    const cameFrom = new Map<string, Position>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    const posKey = (p: Position) => `${p.x},${p.y}`;
    const h = (p: Position) => Math.max(Math.abs(p.x - to.x), Math.abs(p.y - to.y));

    gScore.set(posKey(from), 0);
    fScore.set(posKey(from), h(from));

    while (openSet.length > 0) {
        openSet.sort((a, b) => {
            const fa = fScore.get(posKey(a)) ?? Infinity;
            const fb = fScore.get(posKey(b)) ?? Infinity;
            if (fa !== fb) return fa - fb;
            return posKey(a).localeCompare(posKey(b));
        });

        const current = openSet.shift()!;
        if (current.x === to.x && current.y === to.y) {
            const path: Position[] = [];
            let curr: Position | undefined = current;
            while (curr && (curr.x !== from.x || curr.y !== from.y)) {
                path.unshift(curr);
                curr = cameFrom.get(posKey(curr));
            }
            return path;
        }

        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const neighbor = { x: current.x + dx, y: current.y + dy };
                const { walkable, cost } = getCellCost(state, neighbor);
                if (!walkable) continue;

                const climbCost = getElevationCost(state, current, neighbor);
                if (climbCost === null) continue;   // descent > 1: needs JUMP_DOWN
                const tentativeGScore = (gScore.get(posKey(current)) ?? Infinity) + cost + climbCost;
                if (tentativeGScore < (gScore.get(posKey(neighbor)) ?? Infinity)) {
                    cameFrom.set(posKey(neighbor), current);
                    gScore.set(posKey(neighbor), tentativeGScore);
                    fScore.set(posKey(neighbor), tentativeGScore + h(neighbor));
                    if (!openSet.some(p => p.x === neighbor.x && p.y === neighbor.y)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }
    }
    return null;
}

/**
 * Returns all walkable cells adjacent to a target position.
 */
export function getAdjacentWalkableCells(state: EngineBattleState, pos: Position, actorId: string): Position[] {
    const neighbors: Position[] = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const neighbor = { x: pos.x + dx, y: pos.y + dy };
            const { walkable } = getCellCost(state, neighbor);
            
            if (walkable) {
                const isOccupied = state.battle.participants.some(p => 
                    p.id !== actorId && p.status !== 'casualty' && p.position.x === neighbor.x && p.position.y === neighbor.y
                );
                if (!isOccupied) neighbors.push(neighbor);
            }
        }
    }
    return neighbors;
}

/**
 * Finds the best adjacent cell to a target to perform a Brawl.
 */
export function findOptimalBrawlPosition(
    state: EngineBattleState,
    actorPos: Position,
    targetPos: Position,
    actorId: string
): Position | null {
    const adjacents = getAdjacentWalkableCells(state, targetPos, actorId);
    if (adjacents.length === 0) return null;

    adjacents.sort((a, b) => {
        const distA = Math.max(Math.abs(a.x - actorPos.x), Math.abs(a.y - actorPos.y));
        const distB = Math.max(Math.abs(b.x - actorPos.x), Math.abs(b.y - actorPos.y));
        if (distA !== distB) return distA - distB;
        return `${a.x},${a.y}`.localeCompare(`${b.x},${b.y}`);
    });

    return adjacents[0];
}
