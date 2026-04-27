import { EngineBattleState } from '../types';
import { Position } from '@/types/character';
import { Terrain } from '@/types/battle';
import { getSupercoverCells } from '../../utils/raycast';
import { isPointInTerrain } from '../../utils/terrain';
import { getFigureZ } from './goodShotRules';

function obstacleTop(t: Terrain): number {
    // `losBlockerHeight` overrides physical top when present — used by
    // pieces whose LoS opacity differs from their walkable surface (e.g.
    // closed doors at floor level). Otherwise the top is just the
    // physical top of the piece.
    if (t.losBlockerHeight != null) return t.losBlockerHeight;
    return (t.baseElevation ?? 0) + (t.objectHeight ?? 0);
}

function coverTop(t: Terrain): number {
    return (t.baseElevation ?? 0) + (t.objectHeight ?? 0);
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

    // 4. Area-feature edge rule (rulebook: "Line of Sight into an Area
    //    feature terminates at the nearest edge"). Figures inside the same
    //    Area can see each other within 3" (Chebyshev 3). Otherwise:
    //      - target inside an Area is visible only if the target cell is the
    //        first ray cell in that Area (i.e. on the edge facing the firer);
    //      - shooter inside an Area can see out only from the far-side edge,
    //        i.e. the last ray cell still inside that Area must be the
    //        shooter cell.
    //    Areas on the ray that contain neither end do not block LoS by this
    //    rule (they may still grant cover via calculateCover).
    //
    //    Concealing Areas opt in via `concealsLineOfSight: true`. Roofs
    //    and hills are also `type:'Area'` in data but elevate instead of
    //    conceal, and so omit the flag.
    const isConcealingArea = (t: Terrain): boolean =>
        t.type === 'Area' && t.concealsLineOfSight === true;
    const areasOrigin = state.battle.terrain.filter(t => isConcealingArea(t) && isPointInTerrain(origin, t));
    const areasTarget = state.battle.terrain.filter(t => isConcealingArea(t) && isPointInTerrain(target, t));
    const sharedArea = areasOrigin.find(ao => areasTarget.some(at => at.id === ao.id));
    if (sharedArea) {
        if (chebyshevDistance(origin, target) > 3) return false;
    } else {
        for (const a of areasTarget) {
            const firstIdx = rayCells.findIndex(c => isPointInTerrain(c, a));
            if (firstIdx === -1) continue;
            const fc = rayCells[firstIdx];
            if (fc.x !== target.x || fc.y !== target.y) return false;
        }
        for (const a of areasOrigin) {
            let lastIdx = -1;
            for (let i = 0; i < rayCells.length; i++) {
                if (isPointInTerrain(rayCells[i], a)) lastIdx = i;
            }
            if (lastIdx === -1) continue;
            const lc = rayCells[lastIdx];
            if (lc.x !== origin.x || lc.y !== origin.y) return false;
        }
    }

    // 5. Check for blocking terrain in intermediate cells
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

    const shooterZ = getFigureZ(state, attackerPos);
    const targetZ = getFigureZ(state, targetPos);

    // 2. Target inside a cover piece (rulebook "figure positioned within
    //    an Area feature → cover"). Negated when the shooter is strictly
    //    above the cover top — a roof-side firer looking down into a
    //    forest sees over the canopy. Keeps step 2 consistent with the
    //    height-aware step 3.
    const terrainTargetIsIn = state.battle.terrain.find(t =>
        t.providesCover && isPointInTerrain(targetPos, t)
    );
    if (terrainTargetIsIn) {
        const top = coverTop(terrainTargetIsIn);
        if (shooterZ <= top) return true;
        // shooter strictly above the cover piece — fall through to step 3
    }

    // 3. Check if the ray between them intersects any cover terrain.
    const rayCells = getSupercoverCells(attackerPos, targetPos);
    const coverTerrain = state.battle.terrain.filter(t => t.providesCover);

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
