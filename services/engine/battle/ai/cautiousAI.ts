import { EngineBattleState, BattleAction, EngineDeps } from '../types';
import { findBestTarget, findBestWeaponForTarget } from '../rules/targetingRules';
import { hasLineOfSight } from '../rules/visibilityRules';
import { evaluateMovementOptions, AIWeights } from './complexAIUtils';
import { RngState } from '../../rng/rng';
import { ShootingWeapon } from '../rules/shootingRules';

const CAUTIOUS_WEIGHTS: AIWeights = {
    cover: 300,
    los: 150,
    distance: 100,
    proximity: 0
};

export function generateCautiousAIPlan(
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

    // Regression Fix: fallback to nearest enemy if no visible target found
    const target = enemies.find(e => e.id === targetId) || 
                   enemies.sort((a, b) => {
                       const dA = Math.max(Math.abs(a.position.x - actor.position.x), Math.abs(a.position.y - actor.position.y));
                       const dB = Math.max(Math.abs(b.position.x - actor.position.x), Math.abs(b.position.y - actor.position.y));
                       return dA - dB;
                   })[0];

    if (!target) return { actions: [], nextRng: currentRng };

    // 1.1 Weapon Selection
    const { weapon } = findBestWeaponForTarget(actor, target, actor.weapons as ShootingWeapon[]);
    const weaponRange = weapon?.range || 12;

    const distToTarget = Math.max(Math.abs(actor.position.x - target.position.x), Math.abs(actor.position.y - target.position.y));
    const hasClearLoS = hasLineOfSight(state, actor.position, target.position);

    // 2. Decision Logic
    if (hasClearLoS && distToTarget <= weaponRange) {
        plan.push({ type: 'SHOOT_ATTACK', attackerId: actorId, targetId: target.id, weapon });
        return { actions: plan, nextRng: currentRng };
    }

    // 3. Movement
    const { bestCell } = evaluateMovementOptions(state, actorId, target.id, actor.stats.speed, {
        ...CAUTIOUS_WEIGHTS,
        distance: 0
    });

    let finalMoveTarget = bestCell;
    const bestCellDist = Math.max(Math.abs(bestCell.x - target.position.x), Math.abs(bestCell.y - target.position.y));
    
    if (distToTarget > 12 && bestCellDist <= 12) {
        finalMoveTarget = actor.position;
    }

    if (finalMoveTarget.x !== actor.position.x || finalMoveTarget.y !== actor.position.y) {
        plan.push({ type: 'MOVE_PARTICIPANT', participantId: actorId, to: finalMoveTarget });
    }

    // Shoot if LoS exists from new cell
    if (hasLineOfSight(state, finalMoveTarget, target.position) && weapon.range > 1) {
        plan.push({ type: 'SHOOT_ATTACK', attackerId: actorId, targetId: target.id, weapon });
    }

    return { actions: plan, nextRng: currentRng };
}
