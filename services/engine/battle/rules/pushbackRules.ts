import { Position } from '@/types/character';

// Pure helper for pushback (matches V1 logic for cardinal/diagonal)
// In V1, if dx=0, dy=0, it does a random pushback. 
// Engine V2 is deterministic, so we must handle this gracefully or ensure it doesn't happen for shooting.
// For shooting, attacker and target are distinct, so dx/dy won't be both 0 unless they are stacked (which is possible).
// If they are stacked, we default to no pushback or a fixed direction to maintain purity.
// For parity with V1 which uses Math.random(), we accept divergence here or fix V1 to be deterministic.
// Constraint says: "V1 might apply Stun, but we are instructed to implement 'no effect' for this slice." -> Wait, this was for No Damage.
// For pushback: "Scenario 2: Hit but No Damage (Applies Stun and Pushback)".
// The scenario has distinct positions (0,0) and (0,5), so dx=0, dy=5. Deterministic.

export function computePushbackPosition(targetPos: Position, fromPos: Position): Position {
    const dx = targetPos.x - fromPos.x;
    const dy = targetPos.y - fromPos.y;
    
    // If on same tile, default to no push (or could pick a deterministic direction like +X)
    if (dx === 0 && dy === 0) return targetPos; 
    
    const pushX = Math.sign(dx);
    const pushY = Math.sign(dy);
    return { x: targetPos.x + pushX, y: targetPos.y + pushY };
}

// Pure helper for bounds check
export function isPositionValid(pos: Position, gridSize: { width: number; height: number }): boolean {
    return pos.x >= 0 && pos.x < gridSize.width && pos.y >= 0 && pos.y < gridSize.height;
}
