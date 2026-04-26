import { describe, it, expect } from 'vitest';
import { computeFallDamage, FALL_DAMAGE_THRESHOLD } from './fallRules';

describe('fallRules: computeFallDamage', () => {
    it('drop below threshold returns null (no damage)', () => {
        for (let h = 0; h < FALL_DAMAGE_THRESHOLD; h++) {
            expect(computeFallDamage(h, 6)).toBeNull();
        }
    });

    it('drop equal to threshold triggers damage check', () => {
        const res = computeFallDamage(FALL_DAMAGE_THRESHOLD, 1);
        expect(res).not.toBeNull();
        expect(res!.damage).toBe(FALL_DAMAGE_THRESHOLD + 1);
        expect(res!.dropHeight).toBe(FALL_DAMAGE_THRESHOLD);
        expect(res!.d6Roll).toBe(1);
    });

    it('damage scales with drop height and d6 roll', () => {
        const res = computeFallDamage(5, 4);
        expect(res!.damage).toBe(9);
    });

    it('result echoes inputs for logging', () => {
        const res = computeFallDamage(7, 3);
        expect(res).toEqual({ damage: 10, dropHeight: 7, d6Roll: 3 });
    });
});
