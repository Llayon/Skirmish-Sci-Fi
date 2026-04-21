import { EngineBattleState, EngineDeps } from '../types';
import { BattleParticipant, Position } from '@/types/battle';
import { hasLineOfSight } from './visibilityRules';
import { calculateHitTargetNumberOpenShot } from './shootingRules';
import { RngState } from '../../rng/rng';

// Inline distance helper
function distance(p1: Position, p2: Position): number {
    const dx = Math.abs(p1.x - p2.x);
    const dy = Math.abs(p1.y - p2.y);
    return Math.max(dx, dy);
}

/**
 * Identifies the optimal target for an enemy based on rulebook priorities:
 * 1. Lowest TN
 * 2. Closest Distance
 * 3. Seeded RNG Tie-break
 */
export function findBestTarget(
    state: EngineBattleState,
    actorId: string,
    candidates: BattleParticipant[],
    deps: EngineDeps
): { targetId: string | null; nextRng: RngState } {
    const actor = state.battle.participants.find(p => p.id === actorId);
    let currentRng = state.rng;

    if (!actor || candidates.length === 0) {
        return { targetId: null, nextRng: currentRng };
    }

    // Default weapon for target evaluation (Vertical slice assumes first weapon or unarmed)
    const weapon = actor.weapons[0] || { id: 'unarmed', range: 1, shots: 1, damage: 0, traits: [] };

    // 1. Evaluate all visible candidates
    const evaluated = candidates
        .filter(target => hasLineOfSight(state, actor.position, target.position))
        .map(target => {
            const { targetNumber } = calculateHitTargetNumberOpenShot(actor, target, weapon as any);
            const dist = distance(actor.position, target.position);
            return { id: target.id, tn: targetNumber, dist };
        });

    if (evaluated.length === 0) {
        return { targetId: null, nextRng: currentRng };
    }

    // 2. Initial Sort (Lowest TN, then Closest Distance)
    evaluated.sort((a, b) => {
        if (a.tn !== b.tn) return a.tn - b.tn;
        return a.dist - b.dist;
    });

    // 3. Handle Ties with RNG
    const best = evaluated[0];
    const tied = evaluated.filter(e => e.tn === best.tn && e.dist === best.dist);

    if (tied.length > 1) {
        const { value, next } = deps.rng.d100(currentRng);
        currentRng = next;
        // Simple index picking based on d100
        const index = Math.floor((value / 101) * tied.length);
        return { targetId: tied[index].id, nextRng: currentRng };
    }

    return { targetId: best.id, nextRng: currentRng };
}
