
import { Position, Terrain, Battle, BattleParticipant } from '../types';
import { rollD6 } from './utils/rolls';
import { logger } from './utils/logger';

export const distance = (pos1: Position, pos2: Position): number => {
    const dx = Math.abs(pos1.x - pos2.x);
    const dy = Math.abs(pos1.y - pos2.y);
    return Math.max(dx, dy);
};

export const isPointInTerrain = (point: Position, terrain: Terrain): boolean => {
  return (
    point.x >= terrain.position.x &&
    point.x < terrain.position.x + terrain.size.width &&
    point.y >= terrain.position.y &&
    point.y < terrain.position.y + terrain.size.height
  );
};

const isCellWalkable = (pos: Position, battle: Battle, participantId: string): boolean => {
    if (pos.x < 0 || pos.x >= battle.gridSize.width || pos.y < 0 || pos.y >= battle.gridSize.height) {
        return false;
    }
    if (battle.participants.some(p => p.id !== participantId && p.status !== 'casualty' && p.position.x === pos.x && p.position.y === pos.y)) {
        return false;
    }
    
    const terrainsAtPos = (battle.terrain ?? []).filter(t => isPointInTerrain(pos, t));
    if (terrainsAtPos.length === 0) return true;

    // If there's a door, it's walkable.
    if (terrainsAtPos.some(t => t.type === 'Door')) return true;

    // If there's any other impassable terrain, it's not walkable.
    if (terrainsAtPos.some(t => t.isImpassable)) return false;

    return true;
};

export const findPushbackPosition = (targetPos: Position, fromPos: Position, battle: Battle): Position | null => {
    const dx = targetPos.x - fromPos.x;
    const dy = targetPos.y - fromPos.y;

    const pushX = (dx === 0 && dy === 0) ? (Math.random() > 0.5 ? 1 : -1) : Math.sign(dx);
    const pushY = (dx === 0 && dy === 0) ? (Math.random() > 0.5 ? 1 : -1) : Math.sign(dy);

    const pushPos = { x: targetPos.x + pushX, y: targetPos.y + pushY };
    
    // Check if new position is valid
    if (!isCellWalkable(pushPos, battle, '')) return null;
    
    return pushPos;
};

export const findRandomPushbackPosition = (targetPos: Position, battle: Battle): Position | null => {
    const directions = [
        { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 },
        { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 }
    ];
    // Fisher-Yates shuffle
    for (let i = directions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [directions[i], directions[j]] = [directions[j], directions[i]];
    }

    for (const dir of directions) {
        const pushPos = { x: targetPos.x + dir.x, y: targetPos.y + dir.y };
        if (isCellWalkable(pushPos, battle, '')) { // empty string for participantId to check against all participants
            return pushPos;
        }
    }
    return null; // No valid pushback position found
};


// A* pathfinding to find reachable cells
export const findReachableCells = (startPos: Position, movePoints: number, battle: Battle, movingParticipantId: string): Map<string, number> => {
    const openSet = new Map<string, {pos: Position, cost: number}>();
    const closedSet = new Set<string>();
    const reachable = new Map<string, number>();

    const startKey = `${startPos.x},${startPos.y}`;
    openSet.set(startKey, {pos: startPos, cost: 0});
    reachable.set(startKey, 0);
    
    while(openSet.size > 0) {
        let currentKey = '';
        let lowestCost = Infinity;
        for (const [key, node] of openSet.entries()) {
            if (node.cost < lowestCost) {
                lowestCost = node.cost;
                currentKey = key;
            }
        }
        const currentNode = openSet.get(currentKey)!;
        openSet.delete(currentKey);
        closedSet.add(currentKey);

        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;

                const neighborPos = { x: currentNode.pos.x + dx, y: currentNode.pos.y + dy };
                const neighborKey = `${neighborPos.x},${neighborPos.y}`;

                if (closedSet.has(neighborKey) || !isCellWalkable(neighborPos, battle, movingParticipantId)) continue;

                const terrainsAtNeighbor = (battle.terrain ?? []).filter(t => isPointInTerrain(neighborPos, t));
                const moveCost = terrainsAtNeighbor.some(t => t.isDifficult) ? 2 : 1;
                const newCost = currentNode.cost + moveCost;

                if (newCost <= movePoints) {
                    if (!reachable.has(neighborKey) || newCost < reachable.get(neighborKey)!) {
                        reachable.set(neighborKey, newCost);
                        if (!openSet.has(neighborKey)) {
                            openSet.set(neighborKey, { pos: neighborPos, cost: newCost });
                        }
                    }
                }
            }
        }
    }
    return reachable;
};

const reconstructPath = (cameFrom: Map<string, Position>, current: Position): Position[] => {
    const totalPath = [current];
    let currentKey = `${current.x},${current.y}`;
    while (cameFrom.has(currentKey)) {
        const previousPos = cameFrom.get(currentKey)!;
        totalPath.unshift(previousPos);
        currentKey = `${previousPos.x},${previousPos.y}`;
    }
    return totalPath;
};

export const getLinePath = (from: Position, to: Position): Position[] => {
    const path: Position[] = [];
    const x1 = from.x, y1 = from.y;
    const x2 = to.x, y2 = to.y;
    const dx = Math.abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
    const dy = -Math.abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
    let err = dx + dy, x = x1, y = y1;

    while (true) {
        path.push({ x, y });
        if (x === x2 && y === y2) break;
        if (path.length > 50) break; // Safety break
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x += sx; }
        if (e2 <= dx) { err += dx; y += sy; }
    }
    return path;
}


export const findPath = (startPos: Position, endPos: Position, battle: Battle, participantId: string, toExactPosition: boolean = false): Position[] | null => {
    
    const isPathable = (pos: Position) => {
        // Allow pathing to the end position even if it's occupied by the target of the move
        if (pos.x === endPos.x && pos.y === endPos.y && toExactPosition) {
            const terrainsAtEnd = (battle.terrain ?? []).filter(t => isPointInTerrain(pos, t));
            if (terrainsAtEnd.some(t => t.type === 'Door')) return true;
            if (terrainsAtEnd.some(t => t.isImpassable)) return false;
            return true;
        }
        return isCellWalkable(pos, battle, participantId);
    }
    
    const destinationSquares: Position[] = [];
    if (toExactPosition) {
        if (isPathable(endPos) || (endPos.x === startPos.x && endPos.y === startPos.y)) {
            destinationSquares.push(endPos);
        }
    } else { // Find path to squares adjacent to endPos
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const adjacentPos = { x: endPos.x + dx, y: endPos.y + dy };
                if (isPathable(adjacentPos)) {
                    destinationSquares.push(adjacentPos);
                }
            }
        }
    }

    if (destinationSquares.length === 0) return null; // Target is completely inaccessible
    
    // If we are already at a destination, the path is just the start position
    if (destinationSquares.some(d => d.x === startPos.x && d.y === startPos.y)) {
      return [startPos];
    }

    const openSet = new Map<string, Position>();
    const closedSet = new Set<string>();
    const cameFrom = new Map<string, Position>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    const startKey = `${startPos.x},${startPos.y}`;
    openSet.set(startKey, startPos);
    gScore.set(startKey, 0);
    fScore.set(startKey, Math.min(...destinationSquares.map(d => distance(startPos, d))));

    while (openSet.size > 0) {
        let currentKey = '';
        let lowestFScore = Infinity;
        for (const [key] of openSet.entries()) {
            const score = fScore.get(key) || Infinity;
            if (score < lowestFScore) {
                lowestFScore = score;
                currentKey = key;
            }
        }
        
        const currentPos = openSet.get(currentKey)!;

        if (destinationSquares.some(d => d.x === currentPos.x && d.y === currentPos.y)) {
            return reconstructPath(cameFrom, currentPos);
        }

        openSet.delete(currentKey);
        closedSet.add(currentKey);

        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                
                const neighborPos = { x: currentPos.x + dx, y: currentPos.y + dy };
                const neighborKey = `${neighborPos.x},${neighborPos.y}`;

                if (closedSet.has(neighborKey) || !isPathable(neighborPos)) continue;

                const terrainsAtNeighbor = (battle.terrain ?? []).filter(t => isPointInTerrain(neighborPos, t));
                const moveCost = terrainsAtNeighbor.some(t => t.isDifficult) ? 2 : 1;
                const tentativeGScore = (gScore.get(currentKey) || 0) + moveCost;

                if (tentativeGScore < (gScore.get(neighborKey) || Infinity)) {
                    cameFrom.set(neighborKey, currentPos);
                    gScore.set(neighborKey, tentativeGScore);
                    const h = Math.min(...destinationSquares.map(d => distance(neighborPos, d)));
                    fScore.set(neighborKey, tentativeGScore + h);
                    if (!openSet.has(neighborKey)) {
                        openSet.set(neighborKey, neighborPos);
                    }
                }
            }
        }
    }

    return null; // No path found
};


export const findFleePath = (startPos: Position, fleeFromPos: Position, maxDist: number, battle: Battle, participantId: string): Position => {
    let currentPos = { ...startPos };

    for (let i = 0; i < maxDist; i++) {
        let bestNextPos: Position | null = null;
        let maxDistFromSource = distance(currentPos, fleeFromPos);

        // Check 8 neighbors for the one that maximizes distance from fleeFromPos
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const neighborPos = { x: currentPos.x + dx, y: currentPos.y + dy };
                if (isCellWalkable(neighborPos, battle, participantId)) {
                    const d = distance(neighborPos, fleeFromPos);
                    if (d > maxDistFromSource) {
                        maxDistFromSource = d;
                        bestNextPos = neighborPos;
                    }
                }
            }
        }

        if (bestNextPos) {
            currentPos = bestNextPos;
        } else {
            // Blocked, can't move further
            break;
        }
    }
    return currentPos;
};


export const getRandomPosition = (gridSize: { width: number, height: number }, participants: BattleParticipant[], terrain: Terrain[]): Position => {
    let pos: Position;
    let attempts = 0;
    do {
        pos = {
            x: Math.floor(Math.random() * gridSize.width),
            y: Math.floor(Math.random() * gridSize.height)
        };
        attempts++;
        if (attempts > 100) { // Avoid infinite loop
            logger.error("Could not find a valid random position");
            return { x: 0, y: 0 };
        }
    } while (
        participants.some(p => p.position.x === pos.x && p.position.y === pos.y) ||
        !isCellWalkable(pos, {gridSize, participants, terrain} as Battle, '')
    );
    return pos;
};

export const findDodgePosition = (startPos: Position, battle: Battle, participantId: string): { finalPos: Position, distance: number } => {
    const dodgeDistance = rollD6();

    const directions = [
        { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 },
        { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 }
    ];
    // Fisher-Yates shuffle
    for (let i = directions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [directions[i], directions[j]] = [directions[j], directions[i]];
    }

    for (const direction of directions) {
        let currentPos = { ...startPos };
        // Check if the first step in this direction is valid
        const firstStep = { x: startPos.x + direction.x, y: startPos.y + direction.y };
        if (isCellWalkable(firstStep, battle, participantId)) {
            currentPos = firstStep;
            // Now that we have a valid direction, move the full distance
            for (let i = 1; i < dodgeDistance; i++) {
                const nextPos = { x: currentPos.x + direction.x, y: currentPos.y + direction.y };
                if (isCellWalkable(nextPos, battle, participantId)) {
                    currentPos = nextPos;
                } else {
                    break; // Blocked
                }
            }
            return { finalPos: currentPos, distance: dodgeDistance };
        }
    }
    
    // If no direction was walkable, return original position but still report the roll distance
    return { finalPos: startPos, distance: dodgeDistance };
};

export const findNearestWalkable = (startPos: Position, battle: Battle, participantId: string = ''): Position => {
    if (isCellWalkable(startPos, battle, participantId)) {
        return startPos;
    }
    
    const queue: Position[] = [startPos];
    const visited = new Set<string>([`${startPos.x},${startPos.y}`]);
    
    while(queue.length > 0) {
        const current = queue.shift()!;
        
        if (isCellWalkable(current, battle, participantId)) {
            return current;
        }
        
        // Check neighbors in a spiral pattern for more natural searching
        const neighbors = [
            { x: current.x, y: current.y - 1 }, { x: current.x + 1, y: current.y },
            { x: current.x, y: current.y + 1 }, { x: current.x - 1, y: current.y },
            { x: current.x - 1, y: current.y - 1 }, { x: current.x + 1, y: current.y - 1 },
            { x: current.x + 1, y: current.y + 1 }, { x: current.x - 1, y: current.y + 1 },
        ];

        for (const neighbor of neighbors) {
            const key = `${neighbor.x},${neighbor.y}`;
            if (neighbor.x >= 0 && neighbor.x < battle.gridSize.width &&
                neighbor.y >= 0 && neighbor.y < battle.gridSize.height &&
                !visited.has(key)) {
                visited.add(key);
                queue.push(neighbor);
            }
        }
    }
    
    // Fallback, should not happen on a reasonable map
    return startPos;
};
