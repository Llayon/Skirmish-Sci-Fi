import { Position } from '@/types/character';
import { EngineBattleState } from '../battle/types';
import { Terrain } from '@/types/battle';

/**
 * Checks if a point is within the bounds of a terrain object.
 * Pure function to avoid external dependency.
 */
function isPointInTerrain(point: Position, terrain: Terrain): boolean {
    return (
        point.x >= terrain.position.x &&
        point.x < terrain.position.x + terrain.size.width &&
        point.y >= terrain.position.y &&
        point.y < terrain.position.y + terrain.size.height
    );
}

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
 * Finds the shortest path between two points using A*.
 * Deterministic implementation for Engine V2.
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
    const h = (p: Position) => Math.max(Math.abs(p.x - to.x), Math.abs(p.y - to.y)); // Chebyshev

    gScore.set(posKey(from), 0);
    fScore.set(posKey(from), h(from));

    while (openSet.length > 0) {
        // Deterministic: Pick node with lowest fScore. If tied, pick by key to ensure parity.
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

        // Neighbors (8 directions)
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                
                const neighbor = { x: current.x + dx, y: current.y + dy };
                const { walkable, cost } = getCellCost(state, neighbor);
                
                if (!walkable) continue;

                const tentativeGScore = (gScore.get(posKey(current)) ?? Infinity) + cost;

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

    return null; // No path found
}
