import type { EngineBattleState, BattleEvent, EngineLogEntry } from '../types';
import type { Position } from '@/types/character';

export function moveParticipant(
    state: EngineBattleState,
    action: { type: 'MOVE_PARTICIPANT'; participantId: string; to: Position }
): { next: EngineBattleState; events: BattleEvent[]; log: EngineLogEntry[] } {
    const { battle } = state;
    const { participantId, to } = action;

    // 1. Lookup
    const participantIndex = battle.participants.findIndex(p => p.id === participantId);
    if (participantIndex === -1) {
        throw new Error(`Invariant: Participant ${participantId} not found`);
    }

    const participant = battle.participants[participantIndex];

    // 2. Invariants
    if (participant.status === 'casualty') {
        throw new Error(`Invariant: Casualty cannot move: ${participantId}`);
    }

    // Defensive copy
    const from: Position = { ...participant.position };
    const toPos: Position = { ...to };

    // 3. Update
    // Create new participants array with updated participant
    const nextParticipants = [...battle.participants];
    nextParticipants[participantIndex] = {
        ...participant,
        position: toPos
    };

    const nextState: EngineBattleState = {
        schemaVersion: state.schemaVersion,
        battle: {
            ...battle,
            participants: nextParticipants
        },
        rng: state.rng // rng unchanged
    };

    // 4. Output
    const log: EngineLogEntry[] = [
        { key: 'log.action.move', params: { id: participantId } }
    ];

    const events: BattleEvent[] = [
        { type: 'PARTICIPANT_MOVED', participantId, from, to: { ...toPos } }
    ];

    return { next: nextState, events, log };
}
