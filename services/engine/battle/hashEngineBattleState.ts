import { calculateStateHash } from '../net/stateHash';
import type { EngineBattleState } from './types';

/**
 * Computes the deterministic hash of the engine state.
 * Used for consistency checks, baselines, and synchronization.
 */
export const hashEngineBattleState = (state: EngineBattleState): string => {
    return calculateStateHash(state);
};
