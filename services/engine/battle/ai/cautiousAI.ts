import { EngineBattleState, BattleAction, EngineDeps } from '../types';
import { findBestTarget } from '../rules/targetingRules';
import { calculateCover } from '../rules/visibilityRules';
import { evaluateMovementOptions, AIWeights } from './complexAIUtils';
import { RngState } from '../../rng/rng';
import { ShootingWeapon } from '../rules/shootingRules';

const CAUTIOUS_WEIGHTS: AIWeights = {
    cover: 100,
    los: 200,
    distance: 50, // Positive weight means prefer distance > 12
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
    const isCurrentlyInCover = calculateCover(state, target.position, actor.position);

    // 2. Decision Tree
    if (isCurrentlyInCover) {
        // If already in cover and has LoS -> Stay and Fire
        plan.push({ type: 'SHOOT_ATTACK', attackerId: actorId, targetId: target.id, weapon });
    } else {
        // Need to find cover
        const { bestCell } = evaluateMovementOptions(state, actorId, target.id, actor.stats.speed, CAUTIOUS_WEIGHTS);
        
        if (bestCell.x !== actor.position.x || bestCell.y !== actor.position.y) {
            plan.push({ type: 'MOVE_PARTICIPANT', participantId: actorId, to: bestCell });
        }

        // Shoot if we have an action left and LoS exists from the new cell
        // (Evaluation options already weighted LoS)
        plan.push({ type: 'SHOOT_ATTACK', attackerId: actorId, targetId: target.id, weapon });
    }

    return { actions: plan, nextRng: currentRng };
}
