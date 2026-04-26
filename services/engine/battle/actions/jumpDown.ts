import type { EngineBattleState, BattleEvent, EngineLogEntry, EngineDeps, BattleAction } from '../types';
import type { Position } from '@/types/character';
import { getFigureZ } from '../rules/goodShotRules';
import { computeFallDamage, FALL_DAMAGE_THRESHOLD } from '../rules/fallRules';

/**
 * Resolves a JUMP_DOWN action: a figure drops from its current cell to a
 * lower-elevation cell (rulebook "Moving Up and Down" — jumping down).
 *
 * The handler:
 *   1. Validates the destination is strictly lower than the source.
 *   2. Moves the figure to the destination.
 *   3. If the drop is ≥ 3 grid units, rolls a damage check via
 *      `computeFallDamage` against the figure's own Toughness:
 *        - damage ≥ Toughness → casualty
 *        - damage < Toughness → stun
 *
 * Spatial validation (occupancy, jump distance limits) is left to the
 * caller, mirroring `moveParticipant`.
 */
export function jumpDown(
    state: EngineBattleState,
    action: Extract<BattleAction, { type: 'JUMP_DOWN' }>,
    deps: EngineDeps,
): { next: EngineBattleState; events: BattleEvent[]; log: EngineLogEntry[] } {
    const { battle } = state;
    const { participantId, to } = action;
    const events: BattleEvent[] = [];
    const log: EngineLogEntry[] = [];
    let currentRng = state.rng;

    const idx = battle.participants.findIndex((p) => p.id === participantId);
    if (idx === -1) throw new Error(`Invariant: Participant ${participantId} not found`);
    const participant = battle.participants[idx];
    if (participant.status === 'casualty') {
        throw new Error(`Invariant: Casualty cannot jump: ${participantId}`);
    }

    const from: Position = { ...participant.position };
    const fromZ = getFigureZ(state, from);
    const toZ = getFigureZ(state, to);
    const drop = fromZ - toZ;
    if (drop <= 0) {
        throw new Error(`Invariant: JUMP_DOWN requires destination strictly lower than source (fromZ=${fromZ}, toZ=${toZ})`);
    }

    const nextParticipants = [...battle.participants];
    const moved = { ...participant, position: { ...to } };
    nextParticipants[idx] = moved;

    log.push({ key: 'log.action.jumpDown', params: { id: participantId, drop } });
    events.push({ type: 'PARTICIPANT_MOVED', participantId, from, to: { ...to } });

    let fall: ReturnType<typeof computeFallDamage> = null;
    if (drop >= FALL_DAMAGE_THRESHOLD) {
        const { value, next } = deps.rng.d6(currentRng);
        currentRng = next;
        fall = computeFallDamage(drop, value);
    }

    let outcome: 'unhurt' | 'stunned' | 'casualty' = 'unhurt';
    if (fall) {
        const toughness = moved.stats.toughness;
        log.push({
            key: 'log.info.fallDamage',
            params: { drop: fall.dropHeight, roll: fall.d6Roll, damage: fall.damage, toughness },
        });

        if (fall.damage >= toughness) {
            moved.status = 'casualty';
            moved.actionsRemaining = 0;
            outcome = 'casualty';
            log.push({ key: 'log.info.outcomeCasualty' });
        } else {
            moved.stunTokens = (moved.stunTokens || 0) + 1;
            moved.status = 'stunned';
            outcome = 'stunned';
            log.push({ key: 'log.info.outcomeStunned' });
        }

        events.push({
            type: 'FALL_DAMAGE_RESOLVED',
            participantId,
            dropHeight: fall.dropHeight,
            d6Roll: fall.d6Roll,
            damage: fall.damage,
            toughness,
            outcome,
        });
    }

    return {
        next: {
            ...state,
            battle: { ...battle, participants: nextParticipants },
            rng: currentRng,
        },
        events,
        log,
    };
}
