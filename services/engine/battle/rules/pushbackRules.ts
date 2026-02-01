import type { Position } from '@/types/character';

export interface ComputePushbackArgs {
    attackerPos: Position;
    targetPos: Position;
    gridSize: { width: number; height: number };
    occupiedPositions: Set<string>; // Set of "x,y" strings
}

export function computePushbackPosition(args: ComputePushbackArgs): Position | null {
    const { attackerPos, targetPos, gridSize, occupiedPositions } = args;

    const dx = targetPos.x - attackerPos.x;
    const dy = targetPos.y - attackerPos.y;

    // Determine direction: sign(dx), sign(dy)
    // If dx/dy is 0, then 0.
    const stepX = Math.sign(dx);
    const stepY = Math.sign(dy);

    // If attacker and target are on same tile (should rare/impossible in valid state), no pushback direction.
    // We treat it as no pushback for now to be safe.
    if (stepX === 0 && stepY === 0) {
        return null;
    }

    const candidate: Position = {
        x: targetPos.x + stepX,
        y: targetPos.y + stepY
    };

    // 1. Check Bounds
    if (candidate.x < 0 || candidate.x >= gridSize.width ||
        candidate.y < 0 || candidate.y >= gridSize.height) {
        return null;
    }

    // 2. Check Occupancy
    // Format "x,y" must match how the Set is constructed by caller
    const candidateKey = `${candidate.x},${candidate.y}`;
    if (occupiedPositions.has(candidateKey)) {
        return null;
    }

    // 3. Terrain Check (Vertical Slice: Ignored, assuming open ground or handled by occupancy)
    // Future: Pass terrain array and check isImpassable

    return candidate;
}
