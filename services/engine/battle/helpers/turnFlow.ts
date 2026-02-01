import type { Battle, BattlePhase } from '@/types/battle';
import type { BattleParticipant } from '@/types/character';
import type { EngineBattleState, BattleEvent, EngineLogEntry } from '../types';

export interface TurnFlowResult {
    next: EngineBattleState;
    events: BattleEvent[];
    log: EngineLogEntry[];
}

export type FoundActive = { id: string; index: number };

/**
 * Finds the first valid participant in the given order.
 * Skips casualties and those with 0 actions remaining (though engine v2 strict rules might differ, 
 * sticking to v1 "participant.status !== 'casualty'" is the main filter).
 */
export function findFirstActiveInOrder(
    order: readonly string[], 
    participants: readonly BattleParticipant[],
    startIndexInclusive = 0
): FoundActive | null {
    const participantsMap = new Map(participants.map(p => [p.id, p]));
    for (let i = startIndexInclusive; i < order.length; i++) {
        const participantId = order[i];
        const participant = participantsMap.get(participantId);
        if (participant && participant.status !== 'casualty') {
            return { id: participant.id, index: i };
        }
    }
    return null;
}

/**
 * Finds the next valid participant starting AFTER the current index.
 */
export function findNextActiveInOrder(
    order: readonly string[], 
    participants: readonly BattleParticipant[], 
    currentIndex: number
): FoundActive | null {
    return findFirstActiveInOrder(order, participants, currentIndex + 1);
}

/**
 * Helper to centralize phase transition logic (DRY).
 * Returns new battle state and events/logs for the transition.
 */
export function transitionPhase(
    battle: Battle,
    to: BattlePhase
): { battle: Battle; events: BattleEvent[]; log: EngineLogEntry[] } {
    const from = battle.phase;
    const nextBattle: Battle = {
        ...battle,
        phase: to,
        activeParticipantId: null,
        currentTurnIndex: -1,
    };

    return {
        battle: nextBattle,
        events: [{ type: 'PHASE_CHANGED', from, to }],
        log: [{ key: 'log.phase.changed', params: { from, to } }],
    };
}

/**
 * Main cascade logic: tries to advance phase until it finds an active participant 
 * or completes the round loop.
 * 
 * Flow:
 * quick_actions -> (if empty) -> enemy_actions
 * enemy_actions -> (if empty) -> slow_actions
 * slow_actions -> (if empty) -> end_round
 * end_round -> reaction_roll + round++
 */
export function cascadePhase(state: EngineBattleState): TurnFlowResult {
    let { battle } = state;
    const events: BattleEvent[] = [];
    const log: EngineLogEntry[] = [];
    
    // Safety break to prevent infinite loops (though phases are finite)
    let iterations = 0;
    const MAX_ITERATIONS = 10;

    while (iterations < MAX_ITERATIONS) {
        iterations++;
        
        // 1. If we are in reaction_roll or battle_over, stop cascading.
        // Unless this was called explicitly to start the round (handled by ROLL_INITIATIVE usually).
        if (battle.phase === 'reaction_roll' || battle.phase === 'battle_over') {
            break;
        }

        // 0. Hardening: Idempotency check with Validity Guard.
        if (battle.activeParticipantId !== null) {
             // Verify if the active participant is actually valid for current phase
             let isValid = false;
             const p = battle.participants.find(p => p.id === battle.activeParticipantId);
             
             if (p && p.status !== 'casualty') {
                 // Check if in current order
                 let order: readonly string[] = [];
                 if (battle.phase === 'quick_actions') order = battle.quickActionOrder;
                 else if (battle.phase === 'enemy_actions') order = battle.enemyTurnOrder || [];
                 else if (battle.phase === 'slow_actions') order = battle.slowActionOrder;
                 
                 if (order.includes(battle.activeParticipantId)) {
                     isValid = true;
                 }
             }

             if (isValid) {
                 // Idempotent: already has valid active participant
                 break;
             } else {
                 // Invalid state detected (e.g. from debug/edit). 
                 // Reset active and continue cascade to find next valid.
                 battle = {
                     ...battle,
                     activeParticipantId: null,
                     // If invalid, we don't know where we are index-wise. 
                     // Resetting to -1 is safest to restart phase scan, 
                     // OR we could try to keep index if meaningful. 
                     // Safest is to restart or pick up from 0.
                     // But prompt says: "сбросить active/index и продолжить каскад".
                     currentTurnIndex: -1
                 };
                 // Log this fix? Maybe not strictly required by prompt, but good for debug.
                 // We just proceed to step 2 which will pick up from index 0.
             }
        }

        // 2. Try to find active in current phase
        // Hardening: No rewind. If currentTurnIndex >= 0, start search from there + 1?
        // Wait, if activeParticipantId is null, it implies we just finished a turn OR we just entered phase.
        // If we just entered phase, currentTurnIndex is -1.
        // If we finished turn (but didn't find next yet?), currentTurnIndex might be the last one.
        // BUT cascadePhase is usually called after phase change (index -1) or after roll initiative (index -1).
        // If called from repair/debug where index is N but active is null (weird state), 
        // we should try to pick up from N+1 or N?
        // Prompt says: "Если activeParticipantId === null и currentTurnIndex >= 0 → искать начиная с currentTurnIndex + 1".
        
        const startIndex = battle.currentTurnIndex >= 0 ? battle.currentTurnIndex + 1 : 0;
        
        if (battle.phase === 'quick_actions') {
            const res = findFirstActiveInOrder(battle.quickActionOrder, battle.participants, startIndex);
            if (res) {
                // Found active!
                battle = {
                    ...battle,
                    activeParticipantId: res.id,
                    currentTurnIndex: res.index
                };
                events.push({ type: 'ACTIVE_PARTICIPANT_SET', participantId: res.id });
                events.push({ type: 'TURN_INDEX_SET', index: res.index });
                log.push({ key: 'log.active.set', params: { id: res.id } });
                return { next: { ...state, battle }, events, log };
            }
            // Empty -> Advance to Enemy
            const t = transitionPhase(battle, 'enemy_actions');
            battle = t.battle;
            events.push(...t.events);
            log.push(...t.log);
            continue;
        }

        if (battle.phase === 'enemy_actions') {
             const order = battle.enemyTurnOrder || [];
             const res = findFirstActiveInOrder(order, battle.participants, startIndex);
             if (res) {
                battle = {
                    ...battle,
                    activeParticipantId: res.id,
                    currentTurnIndex: res.index
                };
                events.push({ type: 'ACTIVE_PARTICIPANT_SET', participantId: res.id });
                events.push({ type: 'TURN_INDEX_SET', index: res.index });
                log.push({ key: 'log.active.set', params: { id: res.id } });
                return { next: { ...state, battle }, events, log };
             }
             // Empty -> Advance to Slow
             const t = transitionPhase(battle, 'slow_actions');
             battle = t.battle;
             events.push(...t.events);
             log.push(...t.log);
             continue;
        }

        if (battle.phase === 'slow_actions') {
            const res = findFirstActiveInOrder(battle.slowActionOrder, battle.participants, startIndex);
            if (res) {
                battle = {
                    ...battle,
                    activeParticipantId: res.id,
                    currentTurnIndex: res.index
                };
                events.push({ type: 'ACTIVE_PARTICIPANT_SET', participantId: res.id });
                events.push({ type: 'TURN_INDEX_SET', index: res.index });
                log.push({ key: 'log.active.set', params: { id: res.id } });
                return { next: { ...state, battle }, events, log };
            }
            // Empty -> Advance to End Round
            const t = transitionPhase(battle, 'end_round');
            battle = t.battle;
            events.push(...t.events);
            log.push(...t.log);
            continue;
        }

        if (battle.phase === 'end_round') {
            // Resolve End Round immediately
            const prevPhase = battle.phase;
            const nextRound = battle.round + 1;
            
            // Rebuild enemy turn order for next round (simplified v1 logic: all active enemies)
            const enemyTurnOrder = battle.participants
                .filter(p => p.type === 'enemy' && p.status !== 'casualty')
                .map(p => p.id);

            battle = {
                ...battle,
                phase: 'reaction_roll',
                round: nextRound,
                activeParticipantId: null,
                currentTurnIndex: -1,
                reactionRolls: {},
                reactionRerollsUsed: false,
                quickActionOrder: [], // Reset orders until next initiative
                slowActionOrder: [],
                enemyTurnOrder
            };

            events.push({ type: 'ROUND_INCREMENTED', round: nextRound });
            events.push({ type: 'PHASE_CHANGED', from: prevPhase, to: 'reaction_roll' });
            
            log.push({ key: 'log.round.increment', params: { round: nextRound } });
            log.push({ key: 'log.phase.changed', params: { from: prevPhase, to: 'reaction_roll' } });
            
            // We stop here, waiting for ROLL_INITIATIVE
            return { next: { ...state, battle }, events, log };
        }
    }

    // Fallback if loop limit reached (should not happen in valid flow)
    return { next: { ...state, battle }, events, log };
}
