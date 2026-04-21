import { EngineBattleState } from '../types';
import { Position } from '@/types/character';
import { getSupercoverCells } from '../../utils/raycast';

/**
 * Checks if a point is within the bounds of a terrain object.
 * Multi-cell aware.
 */
function isPointInTerrain(point: Position, terrain: any): boolean {
    return (
        point.x >= terrain.position.x &&
        point.x < terrain.position.x + terrain.size.width &&
        point.y >= terrain.position.y &&
        point.y < terrain.position.y + terrain.size.height
    );
}

/**
 * Checks if there is a clear Line of Sight between two points.
 * Pure function for Engine V2.
 */
export function hasLineOfSight(
    state: EngineBattleState,
    origin: Position,
    target: Position
): boolean {
    // 1. Same cell is always visible
    if (origin.x === target.x && origin.y === target.y) return true;

    // 2. Get all cells the ray passes through
    const rayCells = getSupercoverCells(origin, target);

    // 3. Check for blocking terrain in intermediate cells
    for (const cell of rayCells) {
        // Skip origin and target cells
        if ((cell.x === origin.x && cell.y === origin.y) || 
            (cell.x === target.x && cell.y === target.y)) {
            continue;
        }

        // Find any terrain that covers this cell and blocks LoS
        const blockingTerrain = state.battle.terrain.find(t => 
            t.blocksLineOfSight && isPointInTerrain(cell, t)
        );

        if (blockingTerrain) return false;
    }

    return true;
}
