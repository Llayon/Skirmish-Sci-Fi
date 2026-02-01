import { EngineBattleState, EngineDeps, BattleEvent, EngineLogEntry, BattleAction } from '../types';
import { calculateEffectiveCombatOpenShot, calculateHitTargetNumberOpenShot } from '../rules/shootingRules';
import { computePushbackPosition } from '../rules/pushbackRules';

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
        // Fallback for safety, though caller should ensure valid IDs
        return { next: state, events, log };
    }

    // Clone participants to allow mutation without side effects
    const nextParticipants = battle.participants.map(p => {
        if (p.id === target.id) return { ...p };
        return p;
    });
    const targetMutable = nextParticipants.find(p => p.id === target.id)!;

    // 1. Declare Shot
    log.push({
        key: 'log.action.shoots',
        params: { attacker: attacker.name, defender: target.name, weapon: action.weapon.id }
    });
    events.push({
        type: 'SHOOT_DECLARED',
        attackerId: attacker.id,
        targetId: target.id,
        weaponId: action.weapon.id
    });

    // 2. Resolve Shot (Minimal implementation)
    // Mirroring V1 loop structure (simplest case: 1 shot, no volley logic needed for vertical slice)
    
    // V1 Log: log.info.resolvingShot
    log.push({ key: 'log.info.resolvingShot', params: { shotNum: 1, target: target.name } });

    // Calculate Hit TN using pure rules
    const { targetNumber, reasonKey } = calculateHitTargetNumberOpenShot(attacker, target, action.weapon);

    // Roll
    const { value: roll, next } = deps.rng.d6(currentRng);
    currentRng = next;

    // Calculate Effective Stats
    const combatStat = calculateEffectiveCombatOpenShot(attacker);
    
    // Calculate Bonus (Minimal: just combat stat + base modifiers if any)
    let bonus = combatStat;

    // Log TN
    log.push({ key: 'log.info.targetNumber', params: { targetNum: targetNumber, reason: reasonKey } });
    
    // Check Hit
    const finalRoll = roll + bonus;
    const isHit = finalRoll >= targetNumber;

    // Log Roll Info
    log.push({ 
        key: 'log.info.rollInfo', 
        params: { 
            roll: roll, 
            reroll: '', 
            combat: attacker.stats.combat, 
            bonus: bonus - attacker.stats.combat, 
            total: finalRoll 
        } 
    });

    if (isHit) {
        log.push({ key: 'log.info.hit' });
        events.push({ type: 'SHOT_RESOLVED', attackerId: attacker.id, targetId: target.id, hit: true, roll });
        
        // Damage Roll (Stage 4.2B)
        const { value: damageRoll, next: nextRngAfterDamage } = deps.rng.d6(currentRng);
        currentRng = nextRngAfterDamage;
        
        const weaponDamage = action.weapon.damage;
        const totalDamage = damageRoll + weaponDamage;
        const targetToughness = target.stats.toughness;
        
        log.push({ 
            key: 'log.info.damageRoll', 
            params: { 
                roll: damageRoll, 
                damage: weaponDamage, 
                total: totalDamage, 
                toughness: targetToughness 
            } 
        });

        if (totalDamage < targetToughness) {
            // Non-lethal hit
            // 1. Check Neural Optimization (Stage 4.2C)
            const hasNeuralOpt = targetMutable.type === 'character' && targetMutable.implants.includes('neural_optimization');
            
            if (hasNeuralOpt) {
                log.push({ key: 'log.trait.neuralOptimization' });
            } else {
                // Apply Stun
                targetMutable.stunTokens = (targetMutable.stunTokens || 0) + 1;
                targetMutable.status = 'stunned';
                log.push({ key: 'log.info.outcomeStunned' });
            }

            // 2. Apply Pushback (Stage 4.2D)
            if (battle.gridSize) {
                const occupied = new Set(battle.participants.map(p => `${p.position.x},${p.position.y}`));
                const pushPos = computePushbackPosition({
                    attackerPos: attacker.position,
                    targetPos: targetMutable.position,
                    gridSize: battle.gridSize,
                    occupiedPositions: occupied
                });

                if (pushPos) {
                    const oldPos = targetMutable.position;
                    targetMutable.position = pushPos;
                    log.push({ key: 'log.info.pushedBack' });
                    events.push({
                        type: 'PARTICIPANT_MOVED',
                        participantId: target.id,
                        from: oldPos,
                        to: pushPos
                    });
                } else {
                    log.push({ key: 'log.info.notPushedBack' });
                }
            } else {
                // Safety: no grid size, skip pushback (log as not pushed back or just skip? Test expects notPushedBack log)
                log.push({ key: 'log.info.notPushedBack' });
            }

        } else {
            // Lethal hit
            log.push({ key: 'log.info.lethalHit' });
            targetMutable.status = 'casualty';
            targetMutable.actionsRemaining = 0;
            log.push({ key: 'log.info.outcomeCasualty' });
        }

    } else {
        log.push({ key: 'log.info.miss' });
        events.push({ type: 'SHOT_RESOLVED', attackerId: attacker.id, targetId: target.id, hit: false, roll });
    }

    // Update State
    const nextBattle = { 
        ...battle,
        participants: nextParticipants
    };

    return {
        next: {
            ...state,
            battle: nextBattle,
            rng: currentRng
        },
        events,
        log
    };
}
