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
import { useConsumable } from './actions/useConsumable';

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
            return useConsumable(state, action);
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
