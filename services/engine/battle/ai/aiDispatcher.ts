import { EngineBattleState, BattleAction, EngineDeps } from '../types';
import { RngState } from '../../rng/rng';
import { generateAggressiveAIPlan } from './aggressiveAI';
import { generateRampagingAIPlan } from './rampagingAI';
import { generateCautiousAIPlan } from './cautiousAI';
import { generateTacticalAIPlan } from './tacticalAI';
import { generateDefensiveAIPlan } from './defensiveAI';
import { generateBeastAIPlan } from './beastAI';
import { generateGuardianAIPlan } from './guardianAI';

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
