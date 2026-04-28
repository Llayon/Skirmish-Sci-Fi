import { EngineBattleState, EngineDeps, BattleEvent, EngineLogEntry, BattleAction } from '../types';
import { calculateEffectiveCombatOpenShot, calculateHitTargetNumberOpenShot } from '../rules/shootingRules';
import { computePushbackPosition } from '../rules/pushbackRules';
import { applyGoodShotReroll, hasHeightAdvantage } from '../rules/goodShotRules';
import { hasLineOfSight } from '../rules/visibilityRules';
import type { BattleParticipant, Position } from '@/types/battle';

const TARGET_SWITCH_RANGE = 3;

function chebyshev(a: Position, b: Position): number {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/**
 * Rulebook (multi-shot weapons): "If the target is destroyed, you may
 * select another target within 3" of the original." We pick the closest
 * eligible enemy by Chebyshev distance from the attacker, with a
 * deterministic id-sort tiebreaker. Range/cover for the new shot are
 * recomputed by `calculateHitTargetNumberOpenShot` against the new
 * target — out-of-range candidates may still be picked but will miss
 * (TN 99), matching the rulebook reading that switching is allowed
 * regardless of range to the new target.
 */
function findSwitchTarget(
    state: EngineBattleState,
    attacker: BattleParticipant,
    killedPos: Position,
    killedId: string,
    participants: BattleParticipant[],
): BattleParticipant | null {
    const candidates = participants.filter(p =>
        p.id !== killedId &&
        p.side !== attacker.side &&
        p.status !== 'casualty' &&
        chebyshev(p.position, killedPos) <= TARGET_SWITCH_RANGE &&
        hasLineOfSight(state, attacker.position, p.position),
    );
    candidates.sort((a, b) => {
        const da = chebyshev(attacker.position, a.position);
        const db = chebyshev(attacker.position, b.position);
        if (da !== db) return da - db;
        return a.id.localeCompare(b.id);
    });
    return candidates[0] ?? null;
}

export function shootAttack(
    state: EngineBattleState,
    action: Extract<BattleAction, { type: 'SHOOT_ATTACK' }>,
    deps: EngineDeps
): { next: EngineBattleState; events: BattleEvent[]; log: EngineLogEntry[] } {
    const { battle } = state;
    let currentRng = state.rng;
    const events: BattleEvent[] = [];
    const log: EngineLogEntry[] = [];

    const attacker = battle.participants.find(p => p.id === action.attackerId);
    const target = battle.participants.find(p => p.id === action.targetId);

    if (!attacker || !target) {
        return { next: state, events, log };
    }

    // Clone all participants up-front so the volley can mutate any of
    // them — target-switching after a casualty (rulebook "may select
    // another target within 3"") may hit a different participant on
    // later shots.
    const nextParticipants = battle.participants.map(p => ({ ...p }));
    let targetMutable = nextParticipants.find(p => p.id === target.id)!;

    // 1. Declare Shot
    log.push({
        key: 'log.action.shoots',
        params: { attacker: attacker.name, defender: target.name, weapon: action.weapon.id }
    });
    events.push({
        type: 'SHOOT_DECLARED',
        attackerId: attacker.id,
        targetId: targetMutable.id,
        weaponId: action.weapon.id
    });

    // 2. Roll the entire volley up-front. Multi-shot weapons (`weapon.shots
    //    > 1`) fire all dice as a burst before any resolution; this is what
    //    lets the Good Shot Height Advantage reroll target a single 1
    //    across the whole volley (rulebook errata). With shots: 1 the
    //    behaviour collapses to the original single-shot path.
    const shotsToFire = Math.max(1, action.weapon.shots ?? 1);
    const initialRolls: number[] = [];
    for (let i = 0; i < shotsToFire; i++) {
        const { value, next } = deps.rng.d6(currentRng);
        currentRng = next;
        initialRolls.push(value);
    }

    // 3. Good Shot — Height Advantage: a single reroll across the volley.
    const goodShot = applyGoodShotReroll(
        initialRolls,
        currentRng,
        deps,
        hasHeightAdvantage(state, attacker.position, target.position),
    );
    currentRng = goodShot.rng;
    const firingRolls = goodShot.rolls;
    if (goodShot.rerolled) {
        log.push({
            key: 'log.goodShot.heightAdvantage',
            params: { original: goodShot.rerolled.original, rerolled: goodShot.rerolled.rerolled },
        });
        events.push({
            type: 'GOOD_SHOT_REROLL',
            attackerId: attacker.id,
            targetId: targetMutable.id,
            reason: 'height_advantage',
            original: goodShot.rerolled.original,
            rerolled: goodShot.rerolled.rerolled,
        });
    }

    // 4. Compute volley-wide constants. Target-number is per-target —
    //    recomputed below whenever the volley switches to a new target.
    const combatStat = calculateEffectiveCombatOpenShot(attacker);
    const bonus = combatStat;
    let { targetNumber, reasonKey } = calculateHitTargetNumberOpenShot(attacker, targetMutable, action.weapon);
    log.push({ key: 'log.info.targetNumber', params: { targetNum: targetNumber, reason: reasonKey } });

    // 5. Resolve each shot in order. On a lethal hit, attempt to switch
    //    to another enemy within 3" of the just-killed target (rulebook
    //    multi-shot rule). If no valid target exists, the volley ends.
    let stopVolley = false;
    for (let i = 0; i < firingRolls.length; i++) {
        if (stopVolley) break;

        const initialRoll = initialRolls[i];
        const roll = firingRolls[i];
        const rerollDisplay: number | '' = goodShot.rerolled?.index === i ? goodShot.rerolled.rerolled : '';
        const finalRoll = roll + bonus;
        const isHit = finalRoll >= targetNumber;

        log.push({ key: 'log.info.resolvingShot', params: { shotNum: i + 1, target: targetMutable.name } });
        log.push({
            key: 'log.info.rollInfo',
            params: {
                roll: initialRoll,
                reroll: rerollDisplay,
                combat: attacker.stats.combat,
                bonus: bonus - attacker.stats.combat,
                total: finalRoll,
            },
        });

        if (!isHit) {
            log.push({ key: 'log.info.miss' });
            events.push({ type: 'SHOT_RESOLVED', attackerId: attacker.id, targetId: targetMutable.id, hit: false, roll });
            continue;
        }

        log.push({ key: 'log.info.hit' });
        events.push({ type: 'SHOT_RESOLVED', attackerId: attacker.id, targetId: targetMutable.id, hit: true, roll });

        // Damage roll for this shot.
        const { value: damageRoll, next: nextRngAfterDamage } = deps.rng.d6(currentRng);
        currentRng = nextRngAfterDamage;

        const weaponDamage = action.weapon.damage;
        const totalDamage = damageRoll + weaponDamage;
        const targetToughness = targetMutable.stats.toughness;

        log.push({
            key: 'log.info.damageRoll',
            params: {
                roll: damageRoll,
                damage: weaponDamage,
                total: totalDamage,
                toughness: targetToughness,
            },
        });

        if (totalDamage >= targetToughness) {
            log.push({ key: 'log.info.lethalHit' });
            targetMutable.status = 'casualty';
            targetMutable.actionsRemaining = 0;
            log.push({ key: 'log.info.outcomeCasualty' });

            // Rulebook: on a kill, may select another target within 3"
            // of the destroyed one. If a valid candidate exists, switch
            // and keep firing the remaining shots; otherwise the volley
            // ends.
            const remaining = firingRolls.length - i - 1;
            if (remaining <= 0) {
                stopVolley = true;
                continue;
            }
            const switchTarget = findSwitchTarget(
                state, attacker, targetMutable.position, targetMutable.id, nextParticipants,
            );
            if (!switchTarget) {
                log.push({ key: 'log.info.targetEliminatedNoTargets' });
                stopVolley = true;
                continue;
            }
            log.push({
                key: 'log.info.targetDownSwitchFire',
                params: { attacker: attacker.name, target: switchTarget.name },
            });
            events.push({
                type: 'SHOOT_DECLARED',
                attackerId: attacker.id,
                targetId: switchTarget.id,
                weaponId: action.weapon.id,
            });
            targetMutable = switchTarget;
            ({ targetNumber, reasonKey } = calculateHitTargetNumberOpenShot(attacker, targetMutable, action.weapon));
            log.push({ key: 'log.info.targetNumber', params: { targetNum: targetNumber, reason: reasonKey } });
            continue;
        }

        // Non-lethal: stun (or Neural Optimization no-op) + pushback.
        const hasNeuralOpt = targetMutable.type === 'character' && targetMutable.implants.includes('neural_optimization');
        if (hasNeuralOpt) {
            log.push({ key: 'log.trait.neuralOptimization' });
        } else {
            targetMutable.stunTokens = (targetMutable.stunTokens || 0) + 1;
            targetMutable.status = 'stunned';
            log.push({ key: 'log.info.outcomeStunned' });
        }

        if (battle.gridSize) {
            const occupied = new Set(nextParticipants
                .filter(p => p.status !== 'casualty')
                .map(p => `${p.position.x},${p.position.y}`),
            );
            const pushPos = computePushbackPosition({
                attackerPos: attacker.position,
                targetPos: targetMutable.position,
                gridSize: battle.gridSize,
                occupiedPositions: occupied,
            });

            if (pushPos) {
                const oldPos = targetMutable.position;
                targetMutable.position = pushPos;
                log.push({ key: 'log.info.pushedBack' });
                events.push({
                    type: 'PARTICIPANT_MOVED',
                    participantId: targetMutable.id,
                    from: oldPos,
                    to: pushPos,
                });
            } else {
                log.push({ key: 'log.info.notPushedBack' });
            }
        } else {
            log.push({ key: 'log.info.notPushedBack' });
        }
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
