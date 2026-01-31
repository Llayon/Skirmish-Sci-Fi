import { EngineBattleState, EngineDeps, BattleEvent, EngineLogEntry, BattleAction, Position } from '../types';
import { calculateEffectiveCombatOpenShot, calculateHitTargetNumberOpenShot } from '../rules/shootingRules';

// Pure helper for pushback (matches V1 logic for cardinal/diagonal)
function computePushbackPosition(targetPos: Position, fromPos: Position): Position {
    const dx = targetPos.x - fromPos.x;
    const dy = targetPos.y - fromPos.y;
    // If on same tile (shouldn't happen in shooting), default to no push or minimal fallback
    if (dx === 0 && dy === 0) return targetPos; 
    
    const pushX = Math.sign(dx);
    const pushY = Math.sign(dy);
    return { x: targetPos.x + pushX, y: targetPos.y + pushY };
}

// Pure helper for bounds check
function isPositionValid(pos: Position, gridSize: { width: number; height: number }): boolean {
    return pos.x >= 0 && pos.x < gridSize.width && pos.y >= 0 && pos.y < gridSize.height;
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
    let nextParticipants = battle.participants;

    const attacker = battle.participants.find(p => p.id === action.attackerId);
    const target = battle.participants.find(p => p.id === action.targetId);

    if (!attacker || !target) {
        // Fallback for safety, though caller should ensure valid IDs
        return { next: state, events, log };
    }

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
    const bonus = combatStat;

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
            // Non-lethal
            const hasNeural = target.implants?.includes('neural_optimization');

            if (hasNeural) {
                log.push({ key: 'log.trait.neuralOptimization' });
                // No state change
            } else {
                log.push({ key: 'log.info.outcomeStunned' });

                // Pushback Logic
                let newPos = target.position;
                if (battle.gridSize) {
                    const potentialPos = computePushbackPosition(target.position, attacker.position);
                    // Minimal validation: Bounds only (as per current test requirements)
                    if (isPositionValid(potentialPos, battle.gridSize)) {
                        newPos = potentialPos;
                        log.push({ key: 'log.info.pushedBack' });
                        events.push({ 
                            type: 'PARTICIPANT_MOVED', 
                            participantId: target.id, 
                            from: target.position, 
                            to: newPos 
                        });
                    } else {
                        log.push({ key: 'log.info.notPushedBack' });
                    }
                } else {
                    log.push({ key: 'log.info.notPushedBack' });
                }

                // Apply Stun + Move
                nextParticipants = nextParticipants.map(p => 
                    p.id === target.id 
                        ? { ...p, stunTokens: (p.stunTokens || 0) + 1, status: 'stunned', position: newPos }
                        : p
                );
            }
        } else {
            // Lethal
            log.push({ key: 'log.info.lethalHit' });
            log.push({ key: 'log.info.outcomeCasualty' });
            
            // Apply Casualty
            nextParticipants = nextParticipants.map(p => 
                p.id === target.id 
                    ? { ...p, status: 'casualty', actionsRemaining: 0 }
                    : p
            );
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
