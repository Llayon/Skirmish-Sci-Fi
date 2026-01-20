export type RngState = {
  seed: number;
  cursor: number;
};

/**
 * Creates a new RNG state with the given seed.
 * The cursor starts at 0.
 */
export function createRng(seed: number): RngState {
  return { seed, cursor: 0 };
}

/**
 * Mulberry32 implementation.
 * Returns a number between 0 and 1 (exclusive of 1).
 */
function mulberry32(a: number): number {
  let t = a + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Generates a pseudo-random integer based on the current state.
 * This helper function abstracts the generation logic.
 */
function nextRandom(state: RngState): number {
  // Use a better mixing strategy to avoid correlation between close seeds/cursors.
  // We XOR the seed with a hashed version of the cursor.
  // We use a large prime constant to mix the cursor bits.
  const cursorHash = Math.imul(state.cursor, 0x9E3779B9);
  return mulberry32(state.seed ^ cursorHash);
}

export type D6Result = {
  value: 1 | 2 | 3 | 4 | 5 | 6;
  next: RngState;
};

export function d6(state: RngState): D6Result {
  const rand = nextRandom(state);
  const value = (Math.floor(rand * 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;

  return {
    value,
    next: {
      seed: state.seed,
      cursor: state.cursor + 1,
    },
  };
}

export type D100Result = {
  value: number;
  next: RngState;
};

export function d100(state: RngState): D100Result {
  const rand = nextRandom(state);
  const value = Math.floor(rand * 100) + 1;

  return {
    value,
    next: {
      seed: state.seed,
      cursor: state.cursor + 1,
    },
  };
}
