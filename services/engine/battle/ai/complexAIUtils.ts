import { EngineBattleState } from '../types';
import { Position } from '@/types/character';
import { calculateCover, hasLineOfSight } from '../rules/visibilityRules';

export interface AIWeights {
    cover: number;
    distance: number;
    los: number;
    proximity: number; // For tactical cohesion
}

// Inline distance helper
function getDistance(p1: Position, p2: Position): number {
    return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
}

/**
 * Evaluates all reachable cells and returns the one with the highest score based on weights.
 */
export function evaluateMovementOptions(
    state: EngineBattleState,
    actorId: string,
    targetId: string,
    maxDistance: number,
    weights: AIWeights
): { bestCell: Position, score: number } {
    const actor = state.battle.participants.find(p => p.id === actorId);
    const target = state.battle.participants.find(p => p.id === targetId);

    if (!actor || !target) {
        return { bestCell: actor?.position || { x: 0, y: 0 }, score: 0 };
    }

    let bestCell = actor.position;
    let maxScore = -Infinity;

    // Evaluate reachable cells (simplified grid scan for vertical slice)
    // In a full implementation, we'd use a flood-fill to get only valid reachable cells.
    for (let dx = -maxDistance; dx <= maxDistance; dx++) {
        for (let dy = -maxDistance; dy <= maxDistance; dy++) {
            const cell = { x: actor.position.x + dx, y: actor.position.y + dy };
            
            // Check if within grid and distance
            if (cell.x < 0 || cell.x >= state.battle.gridSize.width || 
                cell.y < 0 || cell.y >= state.battle.gridSize.height ||
                getDistance(actor.position, cell) > maxDistance) {
                continue;
            }

            // Check walkability (no impassable terrain, no other participants)
            const isOccupied = state.battle.participants.some(p => 
                p.id !== actorId && p.status !== 'casualty' && p.position.x === cell.x && p.position.y === cell.y
            );
            const isImpassable = state.battle.terrain.some(t => 
                t.blocksLineOfSight && // Assuming blocksLoS = Impassable for now
                cell.x >= t.position.x && cell.x < t.position.x + t.size.width &&
                cell.y >= t.position.y && cell.y < t.position.y + t.size.height
            );

            if (isOccupied || isImpassable) continue;

            // Calculate Score
            let score = 0;

            // 1. Cover
            if (calculateCover(state, target.position, cell)) {
                score += weights.cover;
            }

            // 2. Line of Sight
            if (hasLineOfSight(state, cell, target.position)) {
                score += weights.los;
            }

            // 3. Distance (Safety or Aggression)
            const dist = getDistance(cell, target.position);
            if (weights.distance > 0) {
                // Cautious: wants to be far (prefer dist > 12)
                if (dist > 12) score += weights.distance;
                else if (dist < 6) score -= weights.distance * 2; // Very dangerous
            } else if (weights.distance < 0) {
                // Aggressive: wants to be close
                score += Math.abs(weights.distance) * (20 - dist);
            }

            if (score > maxScore) {
                maxScore = score;
                bestCell = cell;
            } else if (score === maxScore) {
                // Stable tie-break
                if (cell.x < bestCell.x || (cell.x === bestCell.x && cell.y < bestCell.y)) {
                    bestCell = cell;
                }
            }
        }
    }

    return { bestCell, score: maxScore };
}
