import { EngineBattleState, EngineDeps } from '../types';
import { BattleParticipant, Position } from '@/types/battle';
import { hasLineOfSight } from './visibilityRules';
import { calculateHitTargetNumberOpenShot, ShootingWeapon } from './shootingRules';
import { RngState } from '../../rng/rng';

// Inline distance helper
function distance(p1: Position, p2: Position): number {
    const dx = Math.abs(p1.x - p2.x);
    const dy = Math.abs(p1.y - p2.y);
    return Math.max(dx, dy);
}

export type TargetingPriority = 'TN' | 'Distance';

/**
 * Finds the best weapon for a specific target based on Target Number.
 */
export function findBestWeaponForTarget(
    attacker: BattleParticipant,
    target: BattleParticipant,
    weapons: ShootingWeapon[]
): { weapon: ShootingWeapon; tn: number } {
    if (weapons.length === 0) {
        return { 
            weapon: { id: 'unarmed', range: 1, shots: 1, damage: 0, traits: [] }, 
            tn: 99 
        };
    }

    const evaluated = weapons.map(w => ({
        weapon: w,
        tn: calculateHitTargetNumberOpenShot(attacker, target, w).targetNumber
    }));

    evaluated.sort((a, b) => a.tn - b.tn);
    return evaluated[0];
}

/**
 * Identifies the optimal target for an enemy based on rulebook priorities:
 * 1. Lowest TN (if priority is TN)
 * 2. Closest Distance
 * 3. Seeded RNG Tie-break
 */
export function findBestTarget(
    state: EngineBattleState,
    actorId: string,
    candidates: BattleParticipant[],
    deps: EngineDeps,
    priority: TargetingPriority = 'TN'
): { targetId: string | null; nextRng: RngState } {
    const actor = state.battle.participants.find(p => p.id === actorId);
    let currentRng = state.rng;

    if (!actor || candidates.length === 0) {
        return { targetId: null, nextRng: currentRng };
    }

    // 1. Evaluate all candidates
    const evaluated = candidates
        .filter(target => priority === 'Distance' || hasLineOfSight(state, actor.position, target.position))
        .map(target => {
            // Find best weapon for THIS specific target to get the lowest possible TN
            const bestWeapon = findBestWeaponForTarget(actor, target, actor.weapons as ShootingWeapon[]);
            const dist = distance(actor.position, target.position);
            return { id: target.id, tn: bestWeapon.tn, dist };
        });

    if (evaluated.length === 0) {
        return { targetId: null, nextRng: currentRng };
    }

    // 2. Initial Sort
    evaluated.sort((a, b) => {
        if (priority === 'TN' && a.tn !== b.tn) return a.tn - b.tn;
        if (a.dist !== b.dist) return a.dist - b.dist;
        // Ultimate tie-breaker: stable ID sort
        return a.id.localeCompare(b.id);
    });

    // 3. Handle Ties with RNG
    const best = evaluated[0];
    const tied = evaluated.filter(e => 
        (priority === 'Distance' || e.tn === best.tn) && 
        e.dist === best.dist
    );

    if (tied.length > 1) {
        const { value, next } = deps.rng.d100(currentRng);
        currentRng = next;
        
        // Fair probability distribution: (1-100 values)
        // (value - 1) gives 0-99. 
        // floor((0-99 / 100) * length) gives perfectly distributed indices.
        const index = Math.floor(((value - 1) / 100) * tied.length);
        return { targetId: tied[index].id, nextRng: currentRng };
    }

    return { targetId: best.id, nextRng: currentRng };
}
