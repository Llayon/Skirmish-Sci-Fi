import { EngineBattleState, BattleAction, EngineDeps } from '../types';
import { findBestTarget } from '../rules/targetingRules';
import { getShortestPath } from '../../utils/pathfinding';
import { Position } from '@/types/character';
import { RngState } from '../../rng/rng';
import { ShootingWeapon } from '../rules/shootingRules';

// Inline distance helper
function getDistance(p1: Position, p2: Position): number {
    return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
}

/**
 * Generates an Action Plan for an Aggressive AI participant.
 */
export function generateAggressiveAIPlan(
    state: EngineBattleState,
    actorId: string,
    deps: EngineDeps
): { actions: BattleAction[], nextRng: RngState } {
    const actor = state.battle.participants.find(p => p.id === actorId);
    let currentRng = state.rng;
    const plan: BattleAction[] = [];

    if (!actor || actor.status === 'casualty' || actor.actionsRemaining <= 0) {
        return { actions: [], nextRng: currentRng };
    }

    const enemies = state.battle.participants.filter(p => 
        p.id !== actorId && p.status !== 'casualty' && p.type === 'character'
    );

    // 1. Identify Target
    const { targetId, nextRng } = findBestTarget(state, actorId, enemies, deps);
    currentRng = nextRng;

    const target = enemies.find(e => e.id === targetId) || 
                   enemies.sort((a, b) => getDistance(actor.position, a.position) - getDistance(actor.position, b.position))[0];

    if (!target) return { actions: [], nextRng: currentRng };

    const dist = getDistance(actor.position, target.position);
    const speed = actor.stats.speed;
    const weapon = actor.weapons[0] as ShootingWeapon;
    const isHeavy = weapon?.traits.includes('heavy');

    // 2. Action Logic
    
    // Rule: Heavy weapon figures will not move if they have a Line of Sight to a target.
    if (isHeavy && targetId) {
        plan.push({ type: 'SHOOT_ATTACK', attackerId: actorId, targetId: target.id, weapon });
        return { actions: plan, nextRng: currentRng };
    }

    if (dist <= 1 || (dist <= 12)) {
        // CHARGE MODE: Move full speed and try to Brawl
        const path = getShortestPath(state, actor.position, target.position);
        if (path && path.length > 0) {
            // Find the best cell to stop at (adjacent to target)
            // We take the path and find the last cell that is NOT the target's cell
            const movePath = path.filter(p => p.x !== target.position.x || p.y !== target.position.y);
            
            if (movePath.length > 0) {
                const moveTarget = movePath.slice(0, speed)[movePath.slice(0, speed).length - 1];
                plan.push({ type: 'MOVE_PARTICIPANT', participantId: actorId, to: moveTarget });
                
                const finalDist = getDistance(moveTarget, target.position);
                // Aggressive only brawls if Combat is equal or better
                if (finalDist <= 1 && actor.stats.combat >= target.stats.combat) {
                    plan.push({ type: 'BRAWL_ATTACK', attackerId: actorId, targetId: target.id, weapon });
                }
            } else if (dist <= 1 && actor.stats.combat >= target.stats.combat) {
                // Already adjacent
                plan.push({ type: 'BRAWL_ATTACK', attackerId: actorId, targetId: target.id, weapon });
            }
        }
    } else {
        // TACTICAL ADVANCE: Move half speed (prefer cover) and Shoot
        const path = getShortestPath(state, actor.position, target.position);
        if (path && path.length > 0) {
            const halfSpeed = Math.floor(speed / 2);
            const moveTarget = path.slice(0, halfSpeed)[path.slice(0, halfSpeed).length - 1];
            plan.push({ type: 'MOVE_PARTICIPANT', participantId: actorId, to: moveTarget });
            
            // Shoot if LoS exists (should exist if target found by findBestTarget)
            if (targetId) {
                const weapon = actor.weapons[0];
                if (weapon) {
                    plan.push({ type: 'SHOOT_ATTACK', attackerId: actorId, targetId: target.id, weapon: weapon as ShootingWeapon });
                }
            }
        }
    }

    return { actions: plan, nextRng: currentRng };
}
