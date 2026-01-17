/**
 * Rolls a D100.
 * @returns A number between 1 and 100.
 */
export const rollD100 = (): number => {
  return Math.floor(Math.random() * 100) + 1;
};

/**
 * Rolls a D10.
 * @returns A number between 1 and 10.
 */
export const rollD10 = (): number => {
    return Math.floor(Math.random() * 10) + 1;
};

/**
 * Rolls a D6.
 * @returns A number between 1 and 6.
 */
export const rollD6 = (): number => {
  return Math.floor(Math.random() * 6) + 1;
};
