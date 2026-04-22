import { EngineBattleState, BattleAction, EngineDeps } from '../types';
import { findBestTarget } from '../rules/targetingRules';
import { evaluateMovementOptions, AIWeights } from './complexAIUtils';
import { RngState } from '../../rng/rng';
import { ShootingWeapon } from '../rules/shootingRules';

const BEAST_STALKING_WEIGHTS: AIWeights = {
    cover: 500,
    los: -300,     // Strong preference to NOT be seen
    distance: -50,  // Still wants to get closer
    proximity: 150  // Pack instinct: stay within 2" of friendlies
};

const BEAST_CHARGE_WEIGHTS: AIWeights = {
    cover: 50,
    los: 100,
    distance: -500, // Absolute priority to reach target
    proximity: 50
};

export function generateBeastAIPlan(
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

    // 1. Identify Target (Nearest)
    const { targetId, nextRng } = findBestTarget(state, actorId, enemies, deps, 'Distance');
    currentRng = nextRng;
    const target = enemies.find(e => e.id === targetId);

    if (!target) return { actions: [], nextRng: currentRng };

    const dist = Math.max(Math.abs(actor.position.x - target.position.x), Math.abs(actor.position.y - target.position.y));
    const speed = actor.stats.speed;
    
    // Rule: "They will only break Cover if they can enter a Brawl within two moves."
    const canReachInTwoMoves = dist <= (speed * 2);

    // 2. Decision Logic
    if (canReachInTwoMoves && dist <= speed + 1) {
        // CHARGE MODE: Run full speed to get into Brawl
        const { bestCell } = evaluateMovementOptions(state, actorId, target.id, speed, BEAST_CHARGE_WEIGHTS);
        
        if (bestCell.x !== actor.position.x || bestCell.y !== actor.position.y) {
            plan.push({ type: 'MOVE_PARTICIPANT', participantId: actorId, to: bestCell });
        }

        const finalDist = Math.max(Math.abs(bestCell.x - target.position.x), Math.abs(bestCell.y - target.position.y));
        if (finalDist <= 1) {
            plan.push({ type: 'BRAWL_ATTACK', attackerId: actorId, targetId: target.id, weapon: actor.weapons[0] as ShootingWeapon });
        }
    } else {
        // STALKING MODE: Stay in cover or move to break LoS
        // We evaluate cells with proximity weight to friendly figures
        const { bestCell } = evaluateMovementOptions(state, actorId, target.id, speed, BEAST_STALKING_WEIGHTS);
        
        if (bestCell.x !== actor.position.x || bestCell.y !== actor.position.y) {
            plan.push({ type: 'MOVE_PARTICIPANT', participantId: actorId, to: bestCell });
        }
    }

    return { actions: plan, nextRng: currentRng };
}
