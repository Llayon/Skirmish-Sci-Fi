import { EngineBattleState, BattleAction, EngineDeps } from '../types';
import { findBestTarget } from '../rules/targetingRules';
import { calculateCover, hasLineOfSight } from '../rules/visibilityRules';
import { getShortestPath } from '../../utils/pathfinding';
import { evaluateMovementOptions, AIWeights } from './complexAIUtils';
import { RngState } from '../../rng/rng';
import { ShootingWeapon } from '../rules/shootingRules';

const TACTICAL_WEIGHTS: AIWeights = {
    cover: 250,
    los: 200,
    distance: -20, // Slightly aggressive
    proximity: 100 // Cohesion bonus
};

export function generateTacticalAIPlan(
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

    // 1. Target Evaluation
    const { targetId, nextRng } = findBestTarget(state, actorId, enemies, deps, 'TN');
    currentRng = nextRng;
    const target = enemies.find(e => e.id === targetId);

    if (!target) return { actions: [], nextRng: currentRng };

    const weapon = actor.weapons[0] as ShootingWeapon;
    const distToTarget = Math.max(Math.abs(actor.position.x - target.position.x), Math.abs(actor.position.y - target.position.y));
    const speed = actor.stats.speed;
    const halfSpeed = Math.floor(speed / 2);

    const isCurrentlyInCover = calculateCover(state, target.position, actor.position);
    const hasClearLoS = hasLineOfSight(state, actor.position, target.position);

    // 2. Decision Logic
    
    // Rule: If they have a clear shot and are in Cover, they will remain in place to Aim.
    if (isCurrentlyInCover && hasClearLoS && distToTarget <= (weapon?.range || 12)) {
        plan.push({ type: 'SHOOT_ATTACK', attackerId: actorId, targetId: target.id, weapon });
        return { actions: plan, nextRng: currentRng };
    }

    // Rule: If within one move and possessing higher combat skill, they will enter a brawl.
    if (distToTarget <= speed && actor.stats.combat > target.stats.combat) {
        const path = getShortestPath(state, actor.position, target.position);
        if (path && path.length > 0) {
            const movePath = path.filter(p => p.x !== target.position.x || p.y !== target.position.y);
            const moveTarget = movePath.length > 0 ? movePath[movePath.length - 1] : actor.position;
            
            plan.push({ type: 'MOVE_PARTICIPANT', participantId: actorId, to: moveTarget });
            plan.push({ type: 'BRAWL_ATTACK', attackerId: actorId, targetId: target.id, weapon });
            return { actions: plan, nextRng: currentRng };
        }
    }

    // 3. Movement (Half speed cover seek, or full speed cross open ground)
    
    // Evaluate half speed first
    let moveOption = evaluateMovementOptions(state, actorId, target.id, halfSpeed, TACTICAL_WEIGHTS);
    
    // Rule: "They will cross open ground at full speed, if needed." 
    // If no cover found at half speed, try full speed.
    const isBestCellInCover = calculateCover(state, target.position, moveOption.bestCell);
    if (!isBestCellInCover) {
        moveOption = evaluateMovementOptions(state, actorId, target.id, speed, TACTICAL_WEIGHTS);
    }

    if (moveOption.bestCell.x !== actor.position.x || moveOption.bestCell.y !== actor.position.y) {
        plan.push({ type: 'MOVE_PARTICIPANT', participantId: actorId, to: moveOption.bestCell });
    }

    // Always try to shoot if LoS exists from new position
    plan.push({ type: 'SHOOT_ATTACK', attackerId: actorId, targetId: target.id, weapon });

    return { actions: plan, nextRng: currentRng };
}
