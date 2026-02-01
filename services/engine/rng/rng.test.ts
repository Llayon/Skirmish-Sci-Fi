import { describe, it, expect } from 'vitest';
import { createRng, d6, d100 } from './rng';

describe('RNG Module', () => {
  describe('createRng', () => {
    it('should create an initial state with the given seed and cursor 0', () => {
      const state = createRng(12345);
      expect(state).toEqual({ seed: 12345, cursor: 0 });
    });
  });

  describe('d6', () => {
    it('should return a value between 1 and 6', () => {
      let state = createRng(1);
      for (let i = 0; i < 100; i++) {
        const result = d6(state);
        expect(result.value).toBeGreaterThanOrEqual(1);
        expect(result.value).toBeLessThanOrEqual(6);
        expect(Number.isInteger(result.value)).toBe(true);
        state = result.next;
      }
    });

    it('should increment the cursor', () => {
      const state = createRng(10);
      const result = d6(state);
      expect(result.next.cursor).toBe(state.cursor + 1);
      expect(result.next.seed).toBe(state.seed);
    });

    it('should be deterministic (same seed -> same sequence)', () => {
      const seed = 42;
      const state1 = createRng(seed);
      const state2 = createRng(seed);

      const r1 = d6(state1);
      const r2 = d6(state2);
      expect(r1.value).toBe(r2.value);

      const r3 = d6(r1.next);
      const r4 = d6(r2.next);
      expect(r3.value).toBe(r4.value);
    });

    it('should produce different sequences for different seeds', () => {
      // It is statistically possible to have same first value, so we check a small sequence
      const state1 = createRng(123);
      const state2 = createRng(456);

      const seq1: number[] = [];
      const seq2: number[] = [];

      let s1 = state1;
      let s2 = state2;

      for (let i = 0; i < 10; i++) {
        const r1 = d6(s1);
        seq1.push(r1.value);
        s1 = r1.next;

        const r2 = d6(s2);
        seq2.push(r2.value);
        s2 = r2.next;
      }

      expect(seq1).not.toEqual(seq2);
    });
  });

  describe('d100', () => {
    it('should return a value between 1 and 100', () => {
      let state = createRng(999);
      for (let i = 0; i < 100; i++) {
        const result = d100(state);
        expect(result.value).toBeGreaterThanOrEqual(1);
        expect(result.value).toBeLessThanOrEqual(100);
        expect(Number.isInteger(result.value)).toBe(true);
        state = result.next;
      }
    });

    it('should increment the cursor', () => {
      const state = createRng(55);
      const result = d100(state);
      expect(result.next.cursor).toBe(state.cursor + 1);
    });

    it('should be deterministic', () => {
      const seed = 777;
      const state1 = createRng(seed);
      const state2 = createRng(seed);

      const r1 = d100(state1);
      const r2 = d100(state2);

      expect(r1.value).toBe(r2.value);
    });
  });
});
