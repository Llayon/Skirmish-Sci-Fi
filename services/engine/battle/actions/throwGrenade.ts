import { produce } from 'immer';
import { EngineBattleState, BattleAction, BattleEvent, EngineLogEntry, EngineDeps } from '../types';
import { getParticipantsInRadius } from '../rules/aoeRules';
import { calculateHitTargetNumberOpenShot, ShootingWeapon } from '../rules/shootingRules';

interface ShotResult {
    targetId: string;
    hit: boolean;
    hitRoll: number;
    damageRoll?: number;
}

/**
 * Resolves a grenade/area weapon throw action.
 */
export function throwGrenade(
    state: EngineBattleState,
    action: Extract<BattleAction, { type: 'THROW_GRENADE' }>,
    deps: EngineDeps
): { next: EngineBattleState; events: BattleEvent[]; log: EngineLogEntry[] } {
    const { battle, rng } = state;
    const { attackerId, targetPos, weapon } = action;
    
    const events: BattleEvent[] = [];
    const log: EngineLogEntry[] = [];
    let currentRng = rng;

    const attacker = battle.participants.find(p => p.id === attackerId);
    if (!attacker) return { next: state, events: [], log: [] };

    // 1. Identify Targets
    const allAreaParticipants = getParticipantsInRadius(state, targetPos, weapon.radius);
    const initialTarget = allAreaParticipants.find(p => p.position.x === targetPos.x && p.position.y === targetPos.y) 
                         || allAreaParticipants[0];

    // 2. Pre-calculate all rolls (Deterministic order)
    const shotResults: ShotResult[] = [];
    const targetsToProcess: string[] = [];

    if (initialTarget) {
        // Area weapons vertical slice: shots come from the weapon object or default to 1
        const shots = (weapon as any).shots || 1;
        for (let i = 0; i < shots; i++) targetsToProcess.push(initialTarget.id);
    }
    
    allAreaParticipants
        .filter(p => !initialTarget || p.id !== initialTarget.id)
        .forEach(p => targetsToProcess.push(p.id));

    for (const tId of targetsToProcess) {
        const target = battle.participants.find(p => p.id === tId);
        if (!target) continue;

        // Hit Roll
        const { targetNumber } = calculateHitTargetNumberOpenShot(attacker, target, weapon as ShootingWeapon);
        const { value: hitRoll, next: rngAfterHit } = deps.rng.d6(currentRng);
        currentRng = rngAfterHit;

        const isHit = hitRoll + attacker.stats.combat >= targetNumber;
        const result: ShotResult = { targetId: tId, hit: isHit, hitRoll };

        if (isHit) {
            const { value: damageRoll, next: rngAfterDmg } = deps.rng.d6(currentRng);
            currentRng = rngAfterDmg;
            result.damageRoll = damageRoll;
        }
        shotResults.push(result);
    }

    // 3. Apply results to state
    const nextBattle = produce(battle, draft => {
        const draftAttacker = draft.participants.find(p => p.id === attackerId);
        if (draftAttacker) {
            draftAttacker.actionsRemaining--;
            draftAttacker.actionsTaken.combat = true;
        }

        for (const res of shotResults) {
            const draftTarget = draft.participants.find(p => p.id === res.targetId);
            if (!draftTarget) continue;

            if (res.hit && res.damageRoll !== undefined) {
                const totalDamage = res.damageRoll + weapon.damage;
                const toughness = draftTarget.stats.toughness;

                let killed = false;
                if (totalDamage > toughness) {
                    draftTarget.status = 'casualty';
                    killed = true;
                    log.push({ key: 'log.playerPhase.aoeLethal', params: { target: draftTarget.name } });
                } else {
                    draftTarget.stunTokens = (draftTarget.stunTokens || 0) + 1;
                    draftTarget.status = 'stunned';
                    log.push({ key: 'log.playerPhase.aoeStun', params: { target: draftTarget.name } });
                }

                events.push({ 
                    type: 'AOE_PARTICIPANT_HIT', 
                    targetId: draftTarget.id, 
                    damage: totalDamage, 
                    roll: res.damageRoll,
                    killed
                });
            } else {
                log.push({ key: 'log.playerPhase.aoeMiss', params: { target: draftTarget.name } });
            }
        }
    });

    return { 
        next: { 
            schemaVersion: state.schemaVersion,
            battle: nextBattle, 
            rng: currentRng 
        }, 
        events, 
        log 
    };
}
