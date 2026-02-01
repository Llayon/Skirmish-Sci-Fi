import type { EngineBattleState, EngineDeps, BattleAction } from './types';
import { reduceBattle } from './reduceBattle';
import { hashEngineBattleState } from './hashEngineBattleState';

export interface ReplayStep {
    index: number;
    action: BattleAction;
    stateHash: string; // hash AFTER applying this action
}

export interface ReplayResult {
    final: EngineBattleState;
    steps: ReplayStep[];
}

export function replayBattle(
    initial: EngineBattleState,
    actions: BattleAction[],
    deps: EngineDeps
): ReplayResult {
    let state = initial;
    const steps: ReplayStep[] = [];

    actions.forEach((action, index) => {
        const res = reduceBattle(state, action, deps);
        state = res.next;
        steps.push({
            index,
            action,
            stateHash: res.stateHash
        });
    });

    return { final: state, steps };
}

/**
 * Calculates the final hash from a replay result.
 * Optimizes by using the last step's hash if available,
 * falling back to calculating the hash of the final state (e.g. if no actions were replayed).
 */
export function getReplayFinalHash(result: ReplayResult): string {
    if (result.steps.length > 0) {
        return result.steps[result.steps.length - 1].stateHash;
    }
    return hashEngineBattleState(result.final);
}
