import type { EngineBattleState } from '../types';
import type { Position, Terrain } from '@/types/battle';

function isPointInFootprint(t: Terrain, pos: Position): boolean {
    return (
        pos.x >= t.position.x &&
        pos.x < t.position.x + t.size.width &&
        pos.y >= t.position.y &&
        pos.y < t.position.y + t.size.height
    );
}

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
        (t) => !t.isImpassable && isPointInFootprint(t, pos),
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
