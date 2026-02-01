import type { EngineBattleState, BattleEvent, EngineLogEntry } from '../types';
import type { BattlePhase } from '@/types/battle';
import { findNextActiveInOrder, cascadePhase, transitionPhase } from '../helpers/turnFlow';

export function endTurn(
    state: EngineBattleState,
    action: { type: 'END_TURN'; participantId?: string }
): { next: EngineBattleState; events: BattleEvent[]; log: EngineLogEntry[] } {
    let { battle } = state;
    const { participantId } = action;

    // 1. Validate Phase
    const validPhases = ['quick_actions', 'enemy_actions', 'slow_actions'];
    if (!validPhases.includes(battle.phase)) {
        throw new Error(`Invariant: Cannot END_TURN in phase ${battle.phase}`);
    }

    // 2. Validate Active Participant
    if (battle.activeParticipantId === null) {
        throw new Error('Invariant: Cannot END_TURN when no participant is active');
    }

    if (participantId && participantId !== battle.activeParticipantId) {
        throw new Error(`Invariant: END_TURN for ${participantId} but ${battle.activeParticipantId} is active`);
    }

    const events: BattleEvent[] = [];
    const log: EngineLogEntry[] = [];

    // Log the end of turn
    log.push({ key: 'log.turn.end', params: { id: battle.activeParticipantId } });

    // 3. Try to find NEXT active in current phase
    let currentOrder: string[] = [];
    if (battle.phase === 'quick_actions') currentOrder = battle.quickActionOrder;
    else if (battle.phase === 'enemy_actions') currentOrder = battle.enemyTurnOrder || [];
    else if (battle.phase === 'slow_actions') currentOrder = battle.slowActionOrder;

    const nextActive = findNextActiveInOrder(currentOrder, battle.participants, battle.currentTurnIndex);

    if (nextActive) {
        // Found next in SAME phase
        battle = {
            ...battle,
            activeParticipantId: nextActive.id,
            currentTurnIndex: nextActive.index
        };
        
        events.push({ type: 'ACTIVE_PARTICIPANT_SET', participantId: nextActive.id });
        events.push({ type: 'TURN_INDEX_SET', index: nextActive.index });
        log.push({ key: 'log.active.set', params: { id: nextActive.id } });
        
        return { next: { ...state, battle }, events, log };
    } else {
        // Current phase exhausted -> Cascade
        // Reset active state before cascading
        battle = {
            ...battle,
            activeParticipantId: null,
            currentTurnIndex: -1
        };
        events.push({ type: 'ACTIVE_PARTICIPANT_SET', participantId: null });
        
        // Determine next phase and transition
        let nextPhase: BattlePhase = 'end_round'; // fallback
        if (battle.phase === 'quick_actions') nextPhase = 'enemy_actions';
        else if (battle.phase === 'enemy_actions') nextPhase = 'slow_actions';
        else if (battle.phase === 'slow_actions') nextPhase = 'end_round';

        const t = transitionPhase(battle, nextPhase);
        
        const cascadeResult = cascadePhase({ ...state, battle: t.battle });
        
        return {
            next: cascadeResult.next,
            events: [...events, ...t.events, ...cascadeResult.events],
            log: [...log, ...t.log, ...cascadeResult.log]
        };
    }
}
