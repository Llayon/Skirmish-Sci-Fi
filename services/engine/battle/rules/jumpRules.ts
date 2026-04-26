import type { EngineBattleState } from '../types';
import type { Position } from '@/types/character';
import { getFigureZ } from './goodShotRules';

export interface JumpDownTarget {
    /** Destination cell (Chebyshev-adjacent to the actor). */
    to: Position;
    /** Drop in grid units; always > 0 for a valid target. */
    drop: number;
    /** Whether the drop is large enough to trigger fall-damage rolls. */
    risksFallDamage: boolean;
}

import { FALL_DAMAGE_THRESHOLD } from './fallRules';

/**
 * Lists the orthogonally/diagonally adjacent cells a participant could
 * jump down into:
 *   - cell is in-bounds,
 *   - cell has strictly lower `figureZ` than the actor's current cell,
 *   - cell is not occupied by another active participant,
 *   - cell is not impassable (no walls/closed doors).
 *
 * Pure: returns a fresh array; order is row-major so callers may rank by
 * drop / Chebyshev distance themselves.
 */
export function findJumpDownTargets(
    state: EngineBattleState,
    participantId: string,
): JumpDownTarget[] {
    const actor = state.battle.participants.find((p) => p.id === participantId);
    if (!actor || actor.status === 'casualty') return [];

    const fromZ = getFigureZ(state, actor.position);
    if (fromZ <= 0) return [];

    const grid = state.battle.gridSize;
    const occupied = new Set(
        state.battle.participants
            .filter((p) => p.id !== participantId && p.status !== 'casualty')
            .map((p) => `${p.position.x},${p.position.y}`),
    );

    const out: JumpDownTarget[] = [];
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const x = actor.position.x + dx;
            const y = actor.position.y + dy;
            if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) continue;
            if (occupied.has(`${x},${y}`)) continue;

            const blocked = state.battle.terrain.some(
                (t) =>
                    t.isImpassable &&
                    x >= t.position.x &&
                    x < t.position.x + t.size.width &&
                    y >= t.position.y &&
                    y < t.position.y + t.size.height,
            );
            if (blocked) continue;

            const toZ = getFigureZ(state, { x, y });
            const drop = fromZ - toZ;
            if (drop <= 0) continue;

            out.push({
                to: { x, y },
                drop,
                risksFallDamage: drop >= FALL_DAMAGE_THRESHOLD,
            });
        }
    }
    return out;
}

/**
 * Picks the safest target among the candidates: minimum drop wins, ties
 * broken by stable row-major order (the input order). Returns null when
 * there are no candidates.
 */
export function pickSafestJumpDownTarget(
    targets: JumpDownTarget[],
): JumpDownTarget | null {
    if (targets.length === 0) return null;
    let best = targets[0];
    for (let i = 1; i < targets.length; i++) {
        if (targets[i].drop < best.drop) best = targets[i];
    }
    return best;
}
