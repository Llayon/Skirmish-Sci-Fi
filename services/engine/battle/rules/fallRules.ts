/**
 * Falling / jumping-down damage, per Five Parsecs rulebook
 * "Moving Up and Down" — jumping from heights.
 *
 * In our grid model, 1 inch = 1 grid unit = 1 human figure height. A figure
 * dropping 3 units or more risks injury on landing. The damage step works
 * like a regular hit: a d6 is rolled and added to the drop height to form
 * the total damage compared against the target's Toughness.
 *
 * This module exposes only the pure computation — RNG draws and state
 * mutations belong to the action handler that uses it.
 */

export const FALL_DAMAGE_THRESHOLD = 3;

export interface FallDamageResult {
    /** d6 roll + dropHeight; compare against Toughness. */
    damage: number;
    /** Echoed for logging convenience. */
    dropHeight: number;
    /** Echoed for logging convenience. */
    d6Roll: number;
}

/**
 * Returns the damage value of a fall, or `null` if the drop is too short
 * to trigger the damage check (dropHeight < FALL_DAMAGE_THRESHOLD).
 *
 * Pure function: caller is responsible for rolling the d6 with the seeded
 * RNG and passing it in.
 */
export function computeFallDamage(dropHeight: number, d6Roll: number): FallDamageResult | null {
    if (dropHeight < FALL_DAMAGE_THRESHOLD) return null;
    return {
        damage: d6Roll + dropHeight,
        dropHeight,
        d6Roll,
    };
}
