import { describe, it, expect } from 'vitest';
import { createRng, d6, d100, createScriptedRngState } from './rng';
import type { RngState } from './rng';

describe('Seeded Deterministic RNG', () => {
    
    it('Test 1 — Determinism', () => {
        const seed = 123;
        const results1: number[] = [];
        const results2: number[] = [];

        // Run 1
        let state1 = createRng(seed);
        for (let i = 0; i < 10; i++) {
            const res = d6(state1);
            results1.push(res.value);
            state1 = res.next;
        }

        // Run 2
        let state2 = createRng(seed);
        for (let i = 0; i < 10; i++) {
            const res = d6(state2);
            results2.push(res.value);
            state2 = res.next;
        }

        expect(results1).toEqual(results2);
        expect(results1.length).toBe(10);
    });

    it('Test 2 — Different seeds diverge', () => {
        const resultsA: number[] = [];
        const resultsB: number[] = [];

        let stateA = createRng(123);
        for (let i = 0; i < 20; i++) {
            const res = d6(stateA);
            resultsA.push(res.value);
            stateA = res.next;
        }

        let stateB = createRng(124);
        for (let i = 0; i < 20; i++) {
            const res = d6(stateB);
            resultsB.push(res.value);
            stateB = res.next;
        }

        expect(resultsA).not.toEqual(resultsB);
        // It is statistically possible for the first roll to match, but unlikely for all 20.
        // We check if the sequences are different.
    });

    it('Test 3 — Cursor increments correctly', () => {
        const seed = 1;
        const s0 = createRng(seed);
        expect(s0.cursor).toBe(0);

        const r1 = d6(s0);
        expect(r1.next.cursor).toBe(s0.cursor + 1);

        const r2 = d6(r1.next);
        expect(r2.next.cursor).toBe(s0.cursor + 2);
    });

    it('Test 4 — Range correctness', () => {
        let state: RngState = createRng(999);
        
        // Check D6
        for (let i = 0; i < 1000; i++) {
            const res = d6(state);
            expect(res.value).toBeGreaterThanOrEqual(1);
            expect(res.value).toBeLessThanOrEqual(6);
            expect(Number.isInteger(res.value)).toBe(true);
            state = res.next;
        }

        // Check D100
        state = createRng(888);
        for (let i = 0; i < 1000; i++) {
            const res = d100(state);
            expect(res.value).toBeGreaterThanOrEqual(1);
            expect(res.value).toBeLessThanOrEqual(100);
            expect(Number.isInteger(res.value)).toBe(true);
            state = res.next;
        }
    });
});

describe('rng (scripted)', () => {
    it('returns scripted values and advances cursor', () => {
        let state = createScriptedRngState([
            { die: 'd6', value: 1 },
            { die: 'd6', value: 6 },
            { die: 'd100', value: 42 }
        ]);

        const r1 = d6(state);
        expect(r1.value).toBe(1);
        expect(r1.next.cursor).toBe(1);

        const r2 = d6(r1.next);
        expect(r2.value).toBe(6);
        expect(r2.next.cursor).toBe(2);

        const r3 = d100(r2.next);
        expect(r3.value).toBe(42);
        expect(r3.next.cursor).toBe(3);
    });

    it('throws on die mismatch', () => {
        const state = createScriptedRngState([
            { die: 'd100', value: 50 }
        ]);

        expect(() => d6(state)).toThrow(/mismatch/);
    });

    it('throws when script is exhausted', () => {
        const state = createScriptedRngState([]);
        expect(() => d6(state)).toThrow(/exhausted/);
    });

    it('throws on out of range values', () => {
        // d6 low
        let state = createScriptedRngState([{ die: 'd6', value: 0 }]);
        expect(() => d6(state)).toThrow(/out of range/);

        // d6 high
        state = createScriptedRngState([{ die: 'd6', value: 7 }]);
        expect(() => d6(state)).toThrow(/out of range/);

        // d100 low
        state = createScriptedRngState([{ die: 'd100', value: 0 }]);
        expect(() => d100(state)).toThrow(/out of range/);

        // d100 high
        state = createScriptedRngState([{ die: 'd100', value: 101 }]);
        expect(() => d100(state)).toThrow(/out of range/);
    });
});
