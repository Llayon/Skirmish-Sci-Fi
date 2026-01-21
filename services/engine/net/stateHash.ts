import { stableStringify } from './stableStringify';

/**
 * FNV-1a 32-bit Hash Algorithm
 * Returns a deterministic 8-character hex string.
 * 
 * @param input String to hash
 */
export function hashString(input: string): string {
    let hash = 0x811C9DC5; // FNV offset basis

    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        // Multiply by FNV prime (0x01000193)
        // We use Math.imul to simulate 32-bit integer overflow correctly in JS
        hash = Math.imul(hash, 0x01000193);
    }

    // Force unsigned 32-bit integer
    return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Calculates a deterministic hash of any state object.
 * Uses stableStringify to ensure semantic equality produces the same hash.
 * 
 * @param state State object (or any value)
 */
export function calculateStateHash(state: unknown): string {
    const stringified = stableStringify(state);
    return hashString(stringified);
}
