import type { EngineBattleState, BattleEvent, EngineLogEntry } from '../types';
import type { BattlePhase } from '@/types/battle';
import { cascadePhase, transitionPhase } from '../helpers/turnFlow';

export function advancePhase(
    state: EngineBattleState
): { next: EngineBattleState; events: BattleEvent[]; log: EngineLogEntry[] } {
    const { battle } = state;

    // 1. Guard against invalid phases
    const allowedPhases: BattlePhase[] = ['quick_actions', 'enemy_actions', 'slow_actions'];
    if (!allowedPhases.includes(battle.phase)) {
        throw new Error(`Invariant: Cannot ADVANCE_PHASE during ${battle.phase}; use ROLL_INITIATIVE or valid phase`);
    }

    // 2. Log intention
    const log: EngineLogEntry[] = [
        { key: 'log.action.advance_phase', params: { from: battle.phase } }
    ];

    // 3. Determine Next Phase
    let nextPhase: BattlePhase = 'end_round'; // fallback
    if (battle.phase === 'quick_actions') nextPhase = 'enemy_actions';
    else if (battle.phase === 'enemy_actions') nextPhase = 'slow_actions';
    else if (battle.phase === 'slow_actions') nextPhase = 'end_round';

    // 4. Transition and Cascade
    const t = transitionPhase(battle, nextPhase);
    const events: BattleEvent[] = [...t.events];
    log.push(...t.log);

    const res = cascadePhase({ ...state, battle: t.battle });

    return {
        next: res.next,
        events: [...events, ...res.events],
        log: [...log, ...res.log]
    };
}
