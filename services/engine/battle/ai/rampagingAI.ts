import { EngineBattleState, BattleAction, EngineDeps } from '../types';
import { getShortestPath } from '../../utils/pathfinding';
import { Position } from '@/types/character';
import { RngState } from '../../rng/rng';
import { ShootingWeapon } from '../rules/shootingRules';
import { hasLineOfSight } from '../rules/visibilityRules';
import { findBestTarget } from '../rules/targetingRules';

// Inline distance helper
function getDistance(p1: Position, p2: Position): number {
    return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
}

/**
 * Generates an Action Plan for a Rampaging AI participant.
 * Simplest AI: Moves towards closest opponent and Brawls.
 */
export function generateRampagingAIPlan(
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

    // 1. Identify Closest Target (Deterministic)
    const { targetId, nextRng } = findBestTarget(state, actorId, enemies, deps, 'Distance');
    currentRng = nextRng;

    const target = enemies.find(e => e.id === targetId);

    if (!target) return { actions: [], nextRng: currentRng };

    const speed = actor.stats.speed;
    const weapon = actor.weapons[0] as ShootingWeapon;
    const isHeavy = weapon?.traits.includes('heavy');

    // Rule: Rampagers with Heavy weapons will stand still and fire, if in sight of a target.
    if (isHeavy && hasLineOfSight(state, actor.position, target.position)) {
        plan.push({ type: 'SHOOT_ATTACK', attackerId: actorId, targetId: target.id, weapon });
        return { actions: plan, nextRng: currentRng };
    }

    // 2. Action Logic: Always Charge
    const path = getShortestPath(state, actor.position, target.position);
    if (path && path.length > 0) {
        // Stop adjacent for Brawl
        const movePath = path.filter(p => p.x !== target.position.x || p.y !== target.position.y);
        
        if (movePath.length > 0) {
            const moveTarget = movePath.slice(0, speed)[movePath.slice(0, speed).length - 1];
            plan.push({ type: 'MOVE_PARTICIPANT', participantId: actorId, to: moveTarget });
            
            // Rampaging ALWAYS tries to Brawl
            const finalDist = getDistance(moveTarget, target.position);
            if (finalDist <= 1) {
                plan.push({ type: 'BRAWL_ATTACK', attackerId: actorId, targetId: target.id, weapon: weapon });
            }
        } else {
            // Already adjacent
            plan.push({ type: 'BRAWL_ATTACK', attackerId: actorId, targetId: target.id, weapon: weapon });
        }
    }

    return { actions: plan, nextRng: currentRng };
}
