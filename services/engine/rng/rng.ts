/**
 * Seeded Deterministic RNG (Mulberry32-based)
 * 
 * Provides a pure functional API for random number generation.
 * State is immutable; each roll returns a new state.
 */

export type RngDie = 'd6' | 'd100';
export type RngScriptItem = Readonly<{ die: RngDie; value: number }>;

export type SeededRngState = { seed: number; cursor: number };
export type ScriptedRngState = { 
    kind: 'scripted'; 
    seed: number; 
    cursor: number; 
    script: ReadonlyArray<RngScriptItem>;
};

export type RngState = SeededRngState | ScriptedRngState;

export function isScriptedRngState(rng: RngState): rng is ScriptedRngState {
    return 'kind' in rng && rng.kind === 'scripted';
}

export function createScriptedRngState(script: ReadonlyArray<RngScriptItem>, seed = 0): ScriptedRngState {
    return {
        kind: 'scripted',
        seed,
        cursor: 0,
        script: script.map((item) => ({ ...item })) // Defensive copy
    };
}

/**
 * Creates an initial RNG state from a seed.
 * @param seed Integer seed value
 */
export function createRng(seed: number): SeededRngState {
    return { seed: seed | 0, cursor: 0 };
}

/**
 * Internal Mulberry32 algorithm.
 * Generates a 32-bit integer from a seed state.
 * @param a Input state (seed + cursor)
 * @returns 32-bit integer
 */
function mulberry32(a: number): number {
    let t = a + 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0);
}

/**
 * Generates a float between 0 (inclusive) and 1 (exclusive).
 * @param state Current RNG state
 * @returns Tuple of [randomFloat, nextState]
 */
function nextFloat(state: SeededRngState): { value: number; next: SeededRngState } {
    // Combine seed and cursor to get a unique input for the hash function
    // We mix them to avoid simple linear correlations
    const input = (state.seed ^ 0xDEADBEEF) + Math.imul(state.cursor, 0x9E3779B9); 
    const randomInt = mulberry32(input);
    
    // Convert 32-bit integer to float [0, 1)
    const value = randomInt / 4294967296;

    return {
        value,
        next: { ...state, cursor: state.cursor + 1 }
    };
}

/**
 * Returns integer 1..6
 */
export function d6(state: RngState): { value: 1|2|3|4|5|6; next: RngState } {
    if (isScriptedRngState(state)) {
        if (state.cursor >= state.script.length) {
            throw new Error(`Scripted RNG exhausted at cursor ${state.cursor} (expected d6)`);
        }
        const entry = state.script[state.cursor];
        if (entry.die !== 'd6') {
            throw new Error(`Scripted RNG die mismatch at cursor ${state.cursor}: expected d6, got ${entry.die}`);
        }
        if (entry.value < 1 || entry.value > 6) {
            throw new Error(`Scripted RNG out of range at cursor ${state.cursor}: d6 value ${entry.value}`);
        }
        return {
            value: entry.value as 1|2|3|4|5|6,
            next: { ...state, cursor: state.cursor + 1 }
        };
    }

    const { value: floatVal, next } = nextFloat(state);
    const result = (Math.floor(floatVal * 6) + 1) as 1|2|3|4|5|6;
    return { value: result, next };
}

/**
 * Returns integer 1..100
 */
export function d100(state: RngState): { value: number; next: RngState } {
    if (isScriptedRngState(state)) {
        if (state.cursor >= state.script.length) {
            throw new Error(`Scripted RNG exhausted at cursor ${state.cursor} (expected d100)`);
        }
        const entry = state.script[state.cursor];
        if (entry.die !== 'd100') {
            throw new Error(`Scripted RNG die mismatch at cursor ${state.cursor}: expected d100, got ${entry.die}`);
        }
        if (entry.value < 1 || entry.value > 100) {
            throw new Error(`Scripted RNG out of range at cursor ${state.cursor}: d100 value ${entry.value}`);
        }
        return {
            value: entry.value,
            next: { ...state, cursor: state.cursor + 1 }
        };
    }

    const { value: floatVal, next } = nextFloat(state);
    const result = Math.floor(floatVal * 100) + 1;
    return { value: result, next };
}
