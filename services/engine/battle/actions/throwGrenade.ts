import { produce } from 'immer';
import { EngineBattleState, BattleAction, BattleEvent, EngineLogEntry, EngineDeps } from '../types';
import { getParticipantsInRadius } from '../rules/aoeRules';

/**
 * Resolves a grenade throw action.
 * Hits multiple targets in a deterministic order.
 */
export function throwGrenade(
    state: EngineBattleState,
    action: Extract<BattleAction, { type: 'THROW_GRENADE' }>,
    deps: EngineDeps
): { next: EngineBattleState; events: BattleEvent[]; log: EngineLogEntry[] } {
    const { rng } = state;
    const { attackerId, targetPos, weapon } = action;
    
    const events: BattleEvent[] = [];
    const log: EngineLogEntry[] = [];
    let currentRng = rng;

    // 1. Initial Declaration
    events.push({ 
        type: 'AOE_IMPACT_DECLARED', 
        attackerId, 
        targetPos, 
        radius: weapon.radius, 
        weaponId: weapon.id 
    });
    log.push({ key: 'log.playerPhase.throwsGrenade', params: { name: attackerId, weapon: weapon.id } });

    // 2. Identify Targets (Sorted by ID for determinism)
    const targets = getParticipantsInRadius(state, targetPos, weapon.radius);

    const next = produce(state, draft => {
        const attacker = draft.battle.participants.find(p => p.id === attackerId);
        if (attacker) {
            attacker.actionsRemaining--;
            attacker.actionsTaken.combat = true;
        }

        // 3. Process each target in the blast
        for (const target of targets) {
            const draftTarget = draft.battle.participants.find(p => p.id === target.id);
            if (!draftTarget) continue;

            // Damage Roll
            const { value: damageRoll, next: nextRngD6 } = deps.rng.d6(currentRng);
            currentRng = nextRngD6;

            const totalDamage = damageRoll + weapon.damage;
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
                roll: damageRoll,
                killed
            });
        }
    });

    return { 
        next: { ...next, rng: currentRng }, 
        events, 
        log 
    };
}
