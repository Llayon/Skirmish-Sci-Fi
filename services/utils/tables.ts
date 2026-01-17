import { logger } from "./logger";

/**
 * Resolves a roll on a given random table.
 * @param table - The table to roll on.
 * @param roll - The result of the dice roll.
 * @returns The value from the table entry.
 */
export const resolveTable = <T extends { roll_range: [number, number] }>(table: T[], roll: number): T => {
  const entry = table.find(e => roll >= e.roll_range[0] && roll <= e.roll_range[1]);
  if (!entry) {
    logger.warn(`No table entry found for roll ${roll}. Defaulting to first entry.`);
    return table[0];
  }
  return entry;
};
