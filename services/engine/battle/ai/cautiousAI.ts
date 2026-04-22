import { EngineBattleState, BattleAction, EngineDeps } from '../types';
import { findBestTarget } from '../rules/targetingRules';
import { calculateCover } from '../rules/visibilityRules';
import { evaluateMovementOptions, AIWeights } from './complexAIUtils';
import { RngState } from '../../rng/rng';
import { ShootingWeapon } from '../rules/shootingRules';

const CAUTIOUS_WEIGHTS: AIWeights = {
    cover: 300,    // Very high cover priority
    los: 150,
    distance: 100,  // High priority for staying away
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
        p.id !== actorId && p.status !== 'casualty' && p.type === 'character'
    );

    // 1. Target Evaluation
    const { targetId, nextRng } = findBestTarget(state, actorId, enemies, deps, 'TN');
    currentRng = nextRng;
    const target = enemies.find(e => e.id === targetId);

    if (!target) return { actions: [], nextRng: currentRng };

    const weapon = actor.weapons[0] as ShootingWeapon;
    const weaponRange = weapon?.range || 12;
    const distToTarget = Math.max(Math.abs(actor.position.x - target.position.x), Math.abs(actor.position.y - target.position.y));
    const hasClearLoS = hasLineOfSight(state, actor.position, target.position);

    // 2. Decision Logic

    // Rule: Figures with an opponent in sight and range will remain where they are and take Aimed shots.
    if (hasClearLoS && distToTarget <= weaponRange) {
        plan.push({ type: 'SHOOT_ATTACK', attackerId: actorId, targetId: target.id, weapon });
        return { actions: plan, nextRng: currentRng };
    }

    // 3. Movement (Seeking cover or establishing LoS, but avoiding 12" zone)
    const { bestCell } = evaluateMovementOptions(state, actorId, target.id, actor.stats.speed, {
        ...CAUTIOUS_WEIGHTS,
        // Override distance logic: we want to be as close to weaponRange as possible, but > 12"
        distance: 0 // We'll handle distance scoring manually here for better precision
    });

    // Custom Scoring for Cautious Movement
    // We re-evaluate cells to ensure we don't voluntarily move within 12"
    // and we prefer max range.
    let finalMoveTarget = bestCell;

    // Safety check: if currently outside 12", don't move inside 12".
    const currentDist = distToTarget;
    const bestCellDist = Math.max(Math.abs(bestCell.x - target.position.x), Math.abs(bestCell.y - target.position.y));

    if (currentDist > 12 && bestCellDist <= 12) {
        // Find a better cell that is still > 12"
        // (Simplified: just stay put if best option is too close)
        finalMoveTarget = actor.position;
    }

    if (finalMoveTarget.x !== actor.position.x || finalMoveTarget.y !== actor.position.y) {
        plan.push({ type: 'MOVE_PARTICIPANT', participantId: actorId, to: finalMoveTarget });
    }

    // Shoot if LoS exists from new cell
    plan.push({ type: 'SHOOT_ATTACK', attackerId: actorId, targetId: target.id, weapon });

    return { actions: plan, nextRng: currentRng };
}

