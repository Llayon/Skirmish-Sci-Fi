import { EngineBattleState } from '../types';
import { Position, BattleParticipant } from '@/types/character';

/**
 * Finds all participants within a specified radius from a center point.
 * Deterministic: returns participants sorted by ID.
 */
export function getParticipantsInRadius(
    state: EngineBattleState,
    center: Position,
    radius: number
): BattleParticipant[] {
    const affected = state.battle.participants.filter(p => {
        if (p.status === 'casualty') return false;
        
        const dx = Math.abs(p.position.x - center.x);
        const dy = Math.abs(p.position.y - center.y);
        const dist = Math.max(dx, dy); // Chebyshev distance
        
        return dist <= radius;
    });

    // Stable sort by ID to ensure deterministic processing order
    return affected.sort((a, b) => a.id.localeCompare(b.id));
}
