import { EngineBattleState, BattleAction, EngineDeps } from '../types';
import { evaluateMovementOptions, AIWeights } from './complexAIUtils';
import { RngState } from '../../rng/rng';
import { ShootingWeapon } from '../rules/shootingRules';
import { generateAggressiveAIPlan } from './aggressiveAI';

const GUARDIAN_WEIGHTS: AIWeights = {
    cover: 50,
    los: 100,
    distance: 0, 
    proximity: 500 // Absolute priority to stay near lead
};

/**
 * Generates an Action Plan for a Guardian AI participant.
 * Follows a Lead figure and attacks the same targets.
 */
export function generateGuardianAIPlan(
    state: EngineBattleState,
    actorId: string,
    deps: EngineDeps,
    leadId: string | null
): { actions: BattleAction[], nextRng: RngState } {
    const actor = state.battle.participants.find(p => p.id === actorId);
    const currentRng = state.rng;
    const plan: BattleAction[] = [];

    if (!actor || actor.status === 'casualty' || actor.actionsRemaining <= 0) {
        return { actions: [], nextRng: currentRng };
    }

    // 1. Check Lead status
    const lead = state.battle.participants.find(p => p.id === leadId);
    if (!lead || lead.status === 'casualty') {
        // Revert to Aggressive if no leader
        return generateAggressiveAIPlan(state, actorId, deps);
    }

    // 2. Cohesion: Stay within 3" of Lead
    const distToLead = Math.max(Math.abs(actor.position.x - lead.position.x), Math.abs(actor.position.y - lead.position.y));
    const speed = actor.stats.speed;

    if (distToLead > 3) {
        // Move towards Lead
        const { bestCell } = evaluateMovementOptions(state, actorId, lead.id, speed, GUARDIAN_WEIGHTS);
        if (bestCell.x !== actor.position.x || bestCell.y !== actor.position.y) {
            plan.push({ type: 'MOVE_PARTICIPANT', participantId: actorId, to: bestCell });
        }
    }

    // 3. Combat: Support Lead
    // Identify target - simplified: nearest visible opponent or Lead's target
    const enemies = state.battle.participants.filter(p => 
        p.id !== actorId && p.id !== leadId && p.status !== 'casualty' && p.type === 'character'
    );
    
    // Pick closest to Lead to support
    const target = enemies.sort((a, b) => {
        const dA = Math.max(Math.abs(a.position.x - lead.position.x), Math.abs(a.position.y - lead.position.y));
        const dB = Math.max(Math.abs(b.position.x - lead.position.x), Math.abs(b.position.y - lead.position.y));
        return dA - dB;
    })[0];

    if (target) {
        const weapon = actor.weapons[0] as ShootingWeapon;
        plan.push({ type: 'SHOOT_ATTACK', attackerId: actorId, targetId: target.id, weapon });
    }

    return { actions: plan, nextRng: currentRng };
}
