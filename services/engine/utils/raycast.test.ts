import { describe, it, expect } from 'vitest';
import { getSupercoverCells } from './raycast';

describe('getSupercoverCells', () => {
    it('returns single cell for same origin and target', () => {
        const res = getSupercoverCells({ x: 1, y: 1 }, { x: 1, y: 1 });
        expect(res).toEqual([{ x: 1, y: 1 }]);
    });

    it('returns correct cells for horizontal line', () => {
        const res = getSupercoverCells({ x: 1, y: 5 }, { x: 3, y: 5 });
        expect(res).toEqual([
            { x: 1, y: 5 },
            { x: 2, y: 5 },
            { x: 3, y: 5 }
        ]);
    });

    it('returns correct cells for diagonal line (45 deg)', () => {
        const res = getSupercoverCells({ x: 1, y: 1 }, { x: 3, y: 3 });
        // Supercover should include the "corner" cells if needed, 
        // but for 45 deg it usually hits perfectly.
        expect(res).toContainEqual({ x: 1, y: 1 });
        expect(res).toContainEqual({ x: 2, y: 2 });
        expect(res).toContainEqual({ x: 3, y: 3 });
    });
});
