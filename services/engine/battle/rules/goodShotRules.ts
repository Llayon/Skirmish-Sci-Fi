import type { EngineBattleState, EngineDeps } from '../types';
import type { Position } from '@/types/battle';
import type { RngState } from '../../rng/rng';
import { isPointInTerrain } from '../../utils/terrain';

/**
 * World-space y-height a figure standing in `pos` rests at.
 *
 * Per rulebook, only walkable terrain (`!isImpassable`) supports a figure;
 * we take the top of the highest such surface in the cell:
 *   figureZ = max(baseElevation + objectHeight) over walkable terrain at (x,y)
 *
 * If the cell has no walkable terrain (open ground), the figure is at z=0.
 */
export function getFigureZ(state: EngineBattleState, pos: Position): number {
    const walkable = state.battle.terrain.filter(
        (t) => !t.isImpassable && isPointInTerrain(pos, t),
    );
    if (walkable.length === 0) return 0;
    return Math.max(
        ...walkable.map((t) => (t.baseElevation ?? 0) + (t.objectHeight ?? 0)),
    );
}

/**
 * Good Shot — Height Advantage (rulebook errata):
 *
 * "The firer is positioned at least one human figure height higher than the
 *  target. This only counts the terrain height, the height of the figures
 *  is irrelevant."
 *
 * One human figure height = 1 grid unit in our model. If the firer has a
 * Good Shot, the firer can reroll a single 1 on the firing dice.
 */
export function hasHeightAdvantage(
    state: EngineBattleState,
    attackerPos: Position,
    targetPos: Position,
): boolean {
    return getFigureZ(state, attackerPos) - getFigureZ(state, targetPos) >= 1;
}

export interface GoodShotRerollResult {
    /** Updated rolls — same length and order as input; the first 1 (if
     *  rerolled) is replaced with the new value. */
    rolls: number[];
    /** Index of the rerolled die in the input array, original value, and
     *  the rerolled value. `null` when no reroll happened. */
    rerolled: { index: number; original: 1; rerolled: number } | null;
    /** RNG advanced if a reroll was consumed, otherwise unchanged. */
    rng: RngState;
}

/**
 * Good Shot — Height Advantage reroll, generalised over the firing-dice
 * array. Rulebook says the firer "may reroll a single 1 on the firing
 * dice" — across multi-shot weapons this is one reroll covering all
 * shots, applied to the FIRST die showing a 1 (deterministic choice for
 * replay). With one shot the input is a 1-element array and the
 * behaviour matches the original single-shot encoding.
 *
 * Pure RNG-aware helper: caller passes in the current RngState and the
 * shoot deps; returns the advanced RNG and the (possibly modified)
 * rolls array. No side effects.
 */
export function applyGoodShotReroll(
    rolls: number[],
    rng: RngState,
    deps: EngineDeps,
    eligible: boolean,
): GoodShotRerollResult {
    if (!eligible) return { rolls, rerolled: null, rng };
    const idx = rolls.indexOf(1);
    if (idx === -1) return { rolls, rerolled: null, rng };
    const { value: rerolled, next } = deps.rng.d6(rng);
    const updated = rolls.slice();
    updated[idx] = rerolled;
    return {
        rolls: updated,
        rerolled: { index: idx, original: 1, rerolled },
        rng: next,
    };
}
