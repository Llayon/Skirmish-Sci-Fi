import { EngineBattleState, BattleAction, EngineDeps, BattleEngineResult, BattleEvent, EngineLogEntry } from './types';
import { calculateStateHash } from '../net/stateHash';
import { rollInitiative } from './actions/rollInitiative';
import { moveParticipant } from './actions/moveParticipant';
import { shootAttack } from './actions/shootAttack';
import { brawlAttack } from './actions/brawlAttack';
import { endTurn } from './actions/endTurn';
import { advancePhase } from './actions/advancePhase';
import { interactObjective } from './actions/interactObjective';
import { missionSetup } from './actions/missionSetup';
import { resolveConsumable } from './actions/resolveConsumable';
import { throwGrenade } from './actions/throwGrenade';
import { generateTerrain } from './actions/generateTerrain';
import { jumpDown } from './actions/jumpDown';
import { generateAIPlan } from './ai/aiDispatcher';

function assertNever(x: never): never {
    throw new Error(`reduceBattle: unhandled action ${JSON.stringify(x)}`);
}

function dispatchAction(
    state: EngineBattleState, 
    action: BattleAction, 
    deps: EngineDeps
): { next: EngineBattleState; events: BattleEvent[]; log: EngineLogEntry[] } {
    switch (action.type) {
        case 'ROLL_INITIATIVE':
            return rollInitiative(state, deps);
        case 'MOVE_PARTICIPANT':
            return moveParticipant(state, action);
        case 'SHOOT_ATTACK':
            return shootAttack(state, action, deps);
        case 'BRAWL_ATTACK':
            return brawlAttack(state, action, deps);
        case 'END_TURN':
            return endTurn(state, action);
        case 'ADVANCE_PHASE':
            return advancePhase(state);
        case 'INTERACT_OBJECTIVE':
            return interactObjective(state, action, deps);
        case 'MISSION_SETUP':
            return missionSetup(state, deps);
        case 'USE_CONSUMABLE':
            return resolveConsumable(state, action);
        case 'THROW_GRENADE':
            return throwGrenade(state, action, deps);
        case 'GENERATE_TERRAIN':
            return generateTerrain(state, action);
        case 'JUMP_DOWN':
            return jumpDown(state, action, deps);
        case 'PROCESS_AI_TURN': {
            const { actions: plan, nextRng } = generateAIPlan(state, action.participantId, deps);
            let currentState = { ...state, rng: nextRng };
            const allEvents: BattleEvent[] = [];
            const allLog: EngineLogEntry[] = [];

            for (const subAction of plan) {
                const result = dispatchAction(currentState, subAction, deps);
                currentState = result.next;
                allEvents.push(...result.events);
                allLog.push(...result.log);
            }

            return { next: currentState, events: allEvents, log: allLog };
        }
        default:
            assertNever(action);
    }
}

export function reduceBattle(
    state: EngineBattleState, 
    action: BattleAction, 
    deps: EngineDeps
): BattleEngineResult {
    // Dispatch action
    const result = dispatchAction(state, action, deps);

    // Calculate state hash synchronously (YAGNI optimization for now)
    const stateHash = calculateStateHash(result.next);

    return {
        ...result,
        stateHash
    };
}
