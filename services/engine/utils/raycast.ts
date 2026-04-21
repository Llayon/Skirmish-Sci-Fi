import { Position } from '@/types/character';

/**
 * Returns all grid cells that a line between origin and target passes through.
 * Uses a Supercover Line Algorithm (Modified Amanatides-Woo).
 */
export function getSupercoverCells(origin: Position, target: Position): Position[] {
    const cells: Position[] = [];
    
    let x = origin.x;
    let y = origin.y;
    
    const dx = Math.abs(target.x - origin.x);
    const dy = Math.abs(target.y - origin.y);
    
    const signX = target.x > origin.x ? 1 : -1;
    const signY = target.y > origin.y ? 1 : -1;
    
    cells.push({ x, y });
    
    if (dx === 0 && dy === 0) return cells;
    
    let err = dx - dy;
    const maxSteps = (dx + dy) * 2; // Safety break
    let steps = 0;
    
    while ((x !== target.x || y !== target.y) && steps < maxSteps) {
        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x += signX;
        }
        if (e2 < dx) {
            err += dx;
            y += signY;
        }
        cells.push({ x, y });
        steps++;
    }
    
    return cells;
}
