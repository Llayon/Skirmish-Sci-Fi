import { EngineBattleState } from '../types';
import { Position } from '@/types/character';
import { Terrain } from '@/types/battle';
import { getSupercoverCells } from '../../utils/raycast';
import { getFigureZ } from './goodShotRules';

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

function obstacleTop(t: Terrain): number {
    const top = (t.baseElevation ?? 0) + (t.objectHeight ?? 0);
    // Safeguard: if a piece is flagged as a LoS blocker but no explicit
    // height was populated, treat it as tall enough to block any standing
    // figure. Covers two cases: legacy fixtures that pre-date the height
    // fields, and special-case pieces like doors (blocksLineOfSight=true
    // while occupying a doorway at floor level).
    if (top === 0 && t.blocksLineOfSight) return Number.POSITIVE_INFINITY;
    return top;
}

function coverTop(t: Terrain): number {
    const top = (t.baseElevation ?? 0) + (t.objectHeight ?? 0);
    // Same heuristic for legacy cover pieces lacking height fields: assume
    // they are tall enough to actually grant cover (otherwise old fixtures
    // would lose all cover the moment the new height-aware rule applies).
    if (top === 0 && t.providesCover) return Number.POSITIVE_INFINITY;
    return top;
}

function chebyshevDistance(a: Position, b: Position): number {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/**
 * Checks if there is a clear Line of Sight between two points.
 *
 * Rulebook (Shooting across Linear Obstacles): "Linear obstacles are
 * ignored for Line of Sight purposes if the target figure is entirely
 * visible over them. This is typically the case when the shooter is
 * placed on a raised terrain feature, such as a rooftop."
 *
 * Modeled as: an obstacle blocks LoS only when both shooter and target
 * are at or below the obstacle's top. If either is at least as high as
 * the top of the obstacle, the obstacle is ignored. (Symmetry follows
 * from LoS being mutual; rulebook calls out the shooter-on-rooftop case
 * but the same reasoning applies to a target on a rooftop.)
 *
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

    // 3. Eye heights of shooter and target
    const shooterZ = getFigureZ(state, origin);
    const targetZ = getFigureZ(state, target);

    // 4. Check for blocking terrain in intermediate cells
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

        if (!blockingTerrain) continue;

        // Height-aware ignore: shooter or target sees over the obstacle.
        const top = obstacleTop(blockingTerrain);
        if (shooterZ >= top || targetZ >= top) continue;

        return false;
    }

    return true;
}

/**
 * Calculates if a target has cover from an attacker.
 *
 * Rulebook ("Cover" sidebar): a figure has cover if any of the following:
 *   - Line of Sight crossed any terrain feature MORE THAN 1" from the firer.
 *   - The figure is positioned within an Area feature.
 *   - The figure is in contact with a terrain feature that partially obscures LoS.
 *
 * Encoded here as:
 *   1. No LoS → no cover.
 *   2. Target inside a providesCover Area feature → cover.
 *   3. Ray from firer to target crosses a providesCover piece, AND:
 *        - the piece is more than 1 grid cell (Chebyshev) from the firer,
 *          rulebook: "more than 1" from the firer" — close obstacles let
 *          the firer lean over and shoot at the target without cover, AND
 *        - neither shooter nor target is at or above the top of the cover
 *          piece (height-aware extension of the rulebook 1" rule).
 *
 * Pure function for Engine V2.
 */
export function calculateCover(
    state: EngineBattleState,
    attackerPos: Position,
    targetPos: Position
): boolean {
    // 1. If no LoS, no cover
    if (!hasLineOfSight(state, attackerPos, targetPos)) return false;

    // 2. Check if target is INSIDE cover terrain (Area feature rule)
    const terrainTargetIsIn = state.battle.terrain.find(t =>
        t.providesCover && isPointInTerrain(targetPos, t)
    );
    if (terrainTargetIsIn) return true;

    // 3. Check if the ray between them intersects any cover terrain.
    const rayCells = getSupercoverCells(attackerPos, targetPos);
    const coverTerrain = state.battle.terrain.filter(t => t.providesCover);
    const shooterZ = getFigureZ(state, attackerPos);
    const targetZ = getFigureZ(state, targetPos);

    for (const cell of rayCells) {
        // Skip attacker and target cells
        if ((cell.x === attackerPos.x && cell.y === attackerPos.y) ||
            (cell.x === targetPos.x && cell.y === targetPos.y)) {
            continue;
        }

        for (const t of coverTerrain) {
            if (!isPointInTerrain(cell, t)) continue;

            // Height-aware: shooter or target above cover top → cover useless.
            const top = coverTop(t);
            if (shooterZ >= top || targetZ >= top) continue;

            // Rulebook: cover only counts if the piece is MORE THAN 1" from
            // the firer (Chebyshev > 1 in our grid). Within 1, the firer
            // leans over the obstacle and shoots without granting cover.
            if (chebyshevDistance(attackerPos, cell) <= 1) continue;

            return true;
        }
    }

    return false;
}
