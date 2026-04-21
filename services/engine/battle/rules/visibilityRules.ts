import { EngineBattleState } from '../types';
import { Position } from '@/types/character';
import { Terrain } from '@/types/battle';
import { getSupercoverCells } from '../../utils/raycast';

/**
 * Checks if a point is within the bounds of a terrain object.
 * Multi-cell aware.
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

/**
 * Calculates if a target has cover from an attacker.
 * Pure function for Engine V2.
 */
export function calculateCover(
    state: EngineBattleState,
    attackerPos: Position,
    targetPos: Position
): boolean {
    // 1. If no LoS, no cover
    if (!hasLineOfSight(state, attackerPos, targetPos)) return false;

    // 2. Check if target is INSIDE cover terrain
    const terrainTargetIsIn = state.battle.terrain.find(t => 
        t.providesCover && isPointInTerrain(targetPos, t)
    );
    if (terrainTargetIsIn) return true;

    // 3. Check if the ray between them intersects any cover terrain
    const rayCells = getSupercoverCells(attackerPos, targetPos);
    const coverTerrain = state.battle.terrain.filter(t => t.providesCover);

    for (const cell of rayCells) {
        // Skip attacker and target cells
        if ((cell.x === attackerPos.x && cell.y === attackerPos.y) || 
            (cell.x === targetPos.x && cell.y === targetPos.y)) {
            continue;
        }

        if (coverTerrain.some(t => isPointInTerrain(cell, t))) {
            return true;
        }
    }

    return false;
}
