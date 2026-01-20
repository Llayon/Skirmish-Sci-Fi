import { stableStringify } from './stableStringify';

/**
 * FNV-1a hash implementation
 * A fast, non-cryptographic hash function.
 */
export function hashString(input: string): string {
  let hash = 2166136261;
  const len = input.length;
  for (let i = 0; i < len; i++) {
    hash ^= input.charCodeAt(i);
    // 32-bit integer multiplication
    hash = Math.imul(hash, 16777619);
  }
  // Convert to positive hex string or just unsigned integer string
  // Using unsigned right shift to force positive integer
  return (hash >>> 0).toString(16);
}

/**
 * Calculates a deterministic hash for a given state object.
 *
 * @param state The state object to hash
 * @returns A hash string representing the state
 */
export function calculateStateHash(state: unknown): string {
  const stringified = stableStringify(state);
  return hashString(stringified);
}
