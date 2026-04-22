import { EngineBattleState, BattleAction, EngineDeps } from '../types';
import { findBestTarget, findBestWeaponForTarget } from '../rules/targetingRules';
import { calculateCover, hasLineOfSight } from '../rules/visibilityRules';
import { evaluateMovementOptions, AIWeights } from './complexAIUtils';
import { RngState } from '../../rng/rng';
import { ShootingWeapon } from '../rules/shootingRules';

const DEFENSIVE_WEIGHTS: AIWeights = {
    cover: 300,
    los: 200,
    distance: 0, 
    proximity: 50
};

/**
 * Generates an Action Plan for a Defensive AI participant.
 */
export function generateDefensiveAIPlan(
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
        p.side !== actor.side && p.status !== 'casualty'
    );

    // 1. Identify Target
    const { targetId, nextRng } = findBestTarget(state, actorId, enemies, deps, 'TN');
    currentRng = nextRng;
    const target = enemies.find(e => e.id === targetId);

    if (!target) return { actions: [], nextRng: currentRng };

    const { weapon } = findBestWeaponForTarget(actor, target, actor.weapons as ShootingWeapon[]);
    const isCurrentlyInCover = calculateCover(state, target.position, actor.position);
    const distToTarget = Math.max(Math.abs(actor.position.x - target.position.x), Math.abs(actor.position.y - target.position.y));
    
    const midLine = state.battle.gridSize.width / 2;
    const isHomeLeft = actor.position.x < midLine;

    // 2. Decision Logic
    
    // Special Rule: Reactive Brawl
    if (distToTarget <= 1 && actor.stats.combat >= target.stats.combat) {
        plan.push({ type: 'BRAWL_ATTACK', attackerId: actorId, targetId: target.id, weapon });
        return { actions: plan, nextRng: currentRng };
    }

    if (isCurrentlyInCover && distToTarget <= (weapon?.range || 12)) {
        // In position: Stay Still and Aim
        plan.push({ type: 'SHOOT_ATTACK', attackerId: actorId, targetId: target.id, weapon });
    } else {
        // Need to move, but stay in half
        const { bestCell } = evaluateMovementOptions(state, actorId, target.id, actor.stats.speed, {
            ...DEFENSIVE_WEIGHTS,
            distance: 0 
        });

        const wouldCrossLine = isHomeLeft ? bestCell.x >= midLine : bestCell.x < midLine;
        const moveTarget = wouldCrossLine ? actor.position : bestCell;

        if (moveTarget.x !== actor.position.x || moveTarget.y !== actor.position.y) {
            plan.push({ type: 'MOVE_PARTICIPANT', participantId: actorId, to: moveTarget });
        }

        // Shoot if LoS exists from new position
        if (hasLineOfSight(state, moveTarget, target.position) && weapon.range > 1) {
            plan.push({ type: 'SHOOT_ATTACK', attackerId: actorId, targetId: target.id, weapon });
        }
    }

    return { actions: plan, nextRng: currentRng };
}
