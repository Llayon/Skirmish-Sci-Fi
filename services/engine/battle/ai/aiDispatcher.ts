import { EngineBattleState, BattleAction, EngineDeps } from '../types';
import { RngState } from '../../rng/rng';
import { generateAggressiveAIPlan } from './aggressiveAI';
import { generateRampagingAIPlan } from './rampagingAI';
import { generateCautiousAIPlan } from './cautiousAI';
import { generateTacticalAIPlan } from './tacticalAI';
import { generateDefensiveAIPlan } from './defensiveAI';
import { generateBeastAIPlan } from './beastAI';
import { generateGuardianAIPlan } from './guardianAI';
import { getFigureZ } from '../rules/goodShotRules';
import { findJumpDownTargets, pickSafestJumpDownTarget } from '../rules/jumpRules';
import { getShortestPath } from '../../utils/pathfinding';

/**
 * Pre-step: if the actor is stranded on elevated terrain (figureZ > 0
 * with no walkable path to any enemy) but has at least one valid
 * jump-down target, plan a JUMP_DOWN. Pathfinding refuses descent > 1
 * (rulebook: such drops require a JUMP, not a walk), so without this
 * fallback an AI spawned or pushed onto a plateau would be permanently
 * stuck.
 *
 * The jump alone is the entire turn — fall damage may stun, and even
 * when it doesn't, the next turn from ground level is when the actor
 * resumes normal behaviour.
 */
function planJumpDownIfStranded(
    state: EngineBattleState,
    actorId: string,
): BattleAction[] | null {
    const actor = state.battle.participants.find(p => p.id === actorId);
    if (!actor) return null;
    if (getFigureZ(state, actor.position) <= 0) return null;

    const enemies = state.battle.participants.filter(
        p => p.side !== actor.side && p.status !== 'casualty',
    );
    const anyReachable = enemies.some(
        e => getShortestPath(state, actor.position, e.position) !== null,
    );
    if (anyReachable) return null;

    const target = pickSafestJumpDownTarget(findJumpDownTargets(state, actorId));
    if (!target) return null;
    return [{ type: 'JUMP_DOWN', participantId: actorId, to: target.to }];
}

/**
 * Central dispatcher that generates an action plan for any AI participant.
 * Pure and deterministic.
 */
export function generateAIPlan(
    state: EngineBattleState,
    actorId: string,
    deps: EngineDeps
): { actions: BattleAction[], nextRng: RngState } {
    const actor = state.battle.participants.find(p => p.id === actorId);

    if (!actor || actor.status === 'casualty' || actor.type !== 'enemy') {
        return { actions: [], nextRng: state.rng };
    }

    const stranded = planJumpDownIfStranded(state, actorId);
    if (stranded) return { actions: stranded, nextRng: state.rng };

    // Routing based on AI type
    switch (actor.ai) {
        case 'Aggressive':
            return generateAggressiveAIPlan(state, actorId, deps);
        case 'Rampaging':
            return generateRampagingAIPlan(state, actorId, deps);
        case 'Cautious':
            return generateCautiousAIPlan(state, actorId, deps);
        case 'Tactical':
            return generateTacticalAIPlan(state, actorId, deps);
        case 'Defensive':
            return generateDefensiveAIPlan(state, actorId, deps);
        case 'Beast':
            return generateBeastAIPlan(state, actorId, deps);
        case 'Guardian': {
            // Find Lead: look for guardedBy or nearest non-guardian teammate
            const leadId = actor.guardedBy || null; 
            return generateGuardianAIPlan(state, actorId, deps, leadId);
        }
        default:
            // Fallback for unknown AI types
            return generateAggressiveAIPlan(state, actorId, deps);
    }
}
