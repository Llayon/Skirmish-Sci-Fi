import type { EngineBattleState, BattleEvent, EngineLogEntry, EngineDeps, BattleAction } from '../types';
import type { BattleParticipant, Battle, Position } from '@/types';
import type { RngState } from '@/services/engine/rng/rng';

type BrawlAttackAction = Extract<BattleAction, { type: 'BRAWL_ATTACK' }>;

// Local helper to calculate effective stats without external dependencies
function calculateBrawlStats(participant: BattleParticipant): { combat: number } {
    // Vertical slice: assume simple stat access + basic modifiers
    let combat = participant.stats.combat;
    return { combat };
}

// Local helper to determine brawl bonus
function getBrawlBonus(weapon: { id: string, traits: string[] } | undefined): number {
    if (!weapon) return 0;
    if (weapon.traits.includes('melee')) return 2;
    if (weapon.traits.includes('pistol')) return 1;
    return 0;
}

// Local helper to get defender weapon
function getDefenderBrawlWeapon(participant: BattleParticipant): { id: string, damage: number, traits: string[] } | undefined {
    // Vertical slice: Scan weapons array. We don't have access to Items DB here!
    // Solution: Assume Unarmed (0 bonus) for Defender in Vertical Slice, 
    // OR require Defender weapon to be passed in Action (unrealistic),
    // OR assume Battle state has resolved weapons.
    return undefined; 
}

// Local helper for Pushback (Engine-only, deterministic)
function calculatePushback(
    pusherPos: Position,
    victimPos: Position,
    battle: Battle,
    activeParticipants: BattleParticipant[] = []
): Position | null {
    const dx = victimPos.x - pusherPos.x;
    const dy = victimPos.y - pusherPos.y;
    
    // Normalize to -1, 0, 1
    const stepX = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
    const stepY = dy === 0 ? 0 : (dy > 0 ? 1 : -1);
    
    const targetPos = { x: victimPos.x + stepX, y: victimPos.y + stepY };
    
    // Check bounds and occupancy
    // 1. Check battle participants (excluding active ones who might have moved)
    const activeIds = activeParticipants.map(p => p.id);
    const occupiedByBattle = battle.participants.some(p => 
        !activeIds.includes(p.id) &&
        p.status !== 'casualty' && 
        p.position.x === targetPos.x && 
        p.position.y === targetPos.y
    );

    // 2. Check active participants (using their CURRENT positions)
    const occupiedByActive = activeParticipants.some(p =>
        p.status !== 'casualty' &&
        p.position.x === targetPos.x &&
        p.position.y === targetPos.y
    );
    
    if (occupiedByBattle || occupiedByActive) return null;
    return targetPos;
}

function applyBrawlDamage(
    battle: Battle, 
    source: BattleParticipant, 
    target: BattleParticipant, 
    damage: number, 
    deps: EngineDeps, 
    rngState: RngState
): { targetNext: BattleParticipant, log: EngineLogEntry[], nextRng: RngState, movementEvent?: BattleEvent } {
    let nextTarget = { ...target };
    let logs: EngineLogEntry[] = [];
    let currentRng = rngState;
    let movementEvent: BattleEvent | undefined;

    // Damage Roll vs Toughness
    const damageRoll = deps.rng.d6(currentRng);
    currentRng = damageRoll.next;
    const toughness = nextTarget.stats.toughness;
    const damageTotal = damageRoll.value + damage;
    const isLethal = damageTotal >= toughness || damageRoll.value === 6;

    logs.push({ 
        key: 'log.info.damageRoll', 
        params: { roll: damageRoll.value, damage, total: damageTotal, toughness } 
    });

    if (isLethal) {
        logs.push({ key: 'log.info.lethalHit' });
        nextTarget.status = 'casualty';
        nextTarget.actionsRemaining = 0; 
        logs.push({ key: 'log.info.outcomeCasualty', params: { name: nextTarget.name } });
    } else {
        logs.push({ key: 'log.info.outcomeStunned' });
        nextTarget.stunTokens = (nextTarget.stunTokens || 0) + 1;
        nextTarget.status = 'stunned';
        // Note: V1 calls applyStunAndPushback, which logs 'outcomeStunned' then checks pushback.
        // We replicate 'applyStunAndPushback' logic here for parity.
        
        const originalPos = { ...nextTarget.position };
        // Pass current [source, nextTarget] to avoid stale state checks
        const pushPos = calculatePushback(source.position, nextTarget.position, battle, [source, nextTarget]);
        
        if (pushPos) {
            nextTarget.position = pushPos;
            logs.push({ key: 'log.info.pushedBack', params: { name: nextTarget.name } });
            movementEvent = {
                type: 'PARTICIPANT_MOVED',
                participantId: nextTarget.id,
                from: originalPos,
                to: pushPos
            };
        } else {
            logs.push({ key: 'log.info.notPushedBack', params: { name: nextTarget.name } });
        }
    }

    return { targetNext: nextTarget, log: logs, nextRng: currentRng, movementEvent };
}

export function brawlAttack(
    state: EngineBattleState,
    action: BrawlAttackAction,
    deps: EngineDeps
): { next: EngineBattleState; events: BattleEvent[]; log: EngineLogEntry[] } {
    const { battle, rng } = state;
    const { attackerId, targetId, weapon } = action;

    const attackerIndex = battle.participants.findIndex(p => p.id === attackerId);
    const targetIndex = battle.participants.findIndex(p => p.id === targetId);

    if (attackerIndex === -1 || targetIndex === -1) {
        throw new Error(`Invariant: Brawl participants not found: ${attackerId} vs ${targetId}`);
    }

    // Work with copies to accumulate changes through loops
    let attacker = { ...battle.participants[attackerIndex] };
    let target = { ...battle.participants[targetIndex] };
    // We also need a way to check occupancy against *current* battle state.
    // In V1, pushback checks against static battle state or updated?
    // "battle.participants.find" -> uses current reference.
    // For V2, we should use the initial battle state for occupancy checks (assuming no other movement happens during brawl loop other than the participants).
    // But if someone moves, we need to know. 
    // In 1v1 brawl, only these two move.
    
    const events: BattleEvent[] = [
        { type: 'BRAWL_DECLARED', attackerId, targetId }
    ];
    const log: EngineLogEntry[] = [
        { key: 'log.action.brawls', params: { attacker: attacker.name, defender: target.name } }
    ];

    let currentRng = rng;
    let loopCounter = 0;
    let brawlEnded = false;
    let lastWinnerId: string | null = null;
    let lastLoserId: string | null = null;

    // V1 Parity: Loop up to 5 times (for trapped scenarios)
    while (loopCounter < 5 && !brawlEnded) {
        
        if (loopCounter > 0) {
            log.push({ key: 'log.info.brawlTrapped' });
        } else {
            if (weapon) {
                log.push({ key: 'log.action.brawlerWeapon', params: { name: attacker.name, weapon: weapon.id } });
            } else {
                log.push({ key: 'log.action.brawlerUnarmed', params: { name: attacker.name } });
            }

            const targetWeapon = getDefenderBrawlWeapon(target);
            if (targetWeapon) {
                log.push({ key: 'log.action.brawlerWeapon', params: { name: target.name, weapon: targetWeapon.id } });
            } else {
                log.push({ key: 'log.action.brawlerUnarmed', params: { name: target.name } });
            }
        }

        // V1 Parity: Stunned opponent grants bonus and recovers
        // We check this BEFORE rolls.
        let attackerBonusFromStun = 0;
        if (target.status === 'stunned' && (target.stunTokens || 0) > 0) {
            attackerBonusFromStun = target.stunTokens || 0;
            log.push({ key: 'log.info.brawlerStunBonus', params: { target: target.name, attacker: attacker.name, bonus: attackerBonusFromStun }});
            target.stunTokens = 0;
            target.status = 'active';
        }
        // Same for attacker? V1 usually checks "defenderRef". 
        // V1 code: if (defenderRef.status === 'stunned'...)
        // It doesn't seem to check attacker status for bonus (only canAct check before).
        // We'll stick to V1 logic: Defender Stun helps Attacker.
        // What if Attacker is Stunned? They probably couldn't attack.

        // 1. Rolls
        const attackerRoll = deps.rng.d6(currentRng);
        currentRng = attackerRoll.next;
        const targetRoll = deps.rng.d6(currentRng);
        currentRng = targetRoll.next;

        const attackerStats = calculateBrawlStats(attacker);
        const targetStats = calculateBrawlStats(target);

        const attackerBonus = getBrawlBonus(weapon) + attackerBonusFromStun;
        const targetWeapon = getDefenderBrawlWeapon(target); // Undefined in this slice
        const targetBonus = getBrawlBonus(targetWeapon);

        const attackerTotal = attackerRoll.value + attackerStats.combat + attackerBonus;
        const targetTotal = targetRoll.value + targetStats.combat + targetBonus;

        log.push({ key: 'log.info.brawlRoll', params: { name: attacker.name, roll: attackerRoll.value, total: attackerTotal } });
        log.push({ key: 'log.info.brawlRoll', params: { name: target.name, roll: targetRoll.value, total: targetTotal } });

        // 2. Determine Winner
        let winnerId: string | null = null;
        
        if (attackerTotal > targetTotal) {
            winnerId = attackerId;
            lastWinnerId = attackerId;
            lastLoserId = targetId;
            log.push({ key: 'log.info.brawlWinner', params: { name: attacker.name } });
        } else if (targetTotal > attackerTotal) {
            winnerId = targetId;
            lastWinnerId = targetId;
            lastLoserId = attackerId;
            log.push({ key: 'log.info.brawlWinner', params: { name: target.name } });
        } else {
            log.push({ key: 'log.info.brawlTie' });
        }

        // 3. Fumbles & Crits
        let damageToAttacker = 0;
        let damageToDefender = 0;

        if (winnerId === attackerId) damageToDefender++;
        if (winnerId === targetId) damageToAttacker++;

        if (attackerRoll.value === 1) { damageToAttacker++; log.push({ key: 'log.info.brawlFumble', params: { name: attacker.name }}); }
        if (attackerRoll.value === 6) { damageToDefender++; log.push({ key: 'log.info.brawlCrit', params: { name: attacker.name }}); }
        if (targetRoll.value === 1) { damageToDefender++; log.push({ key: 'log.info.brawlFumble', params: { name: target.name }}); }
        if (targetRoll.value === 6) { damageToAttacker++; log.push({ key: 'log.info.brawlCrit', params: { name: target.name }}); }

        // 4. Apply Hits
        // Apply hits to Defender
        for (let i = 0; i < damageToDefender; i++) {
            const dmg = weapon ? weapon.damage : 0;
            const res = applyBrawlDamage(battle, attacker, target, dmg, deps, currentRng);
            target = res.targetNext;
            log.push(...res.log);
            if (res.movementEvent) events.push(res.movementEvent);
            currentRng = res.nextRng;
            if (target.status === 'casualty') break;
        }

        // Apply hits to Attacker
        for (let i = 0; i < damageToAttacker; i++) {
            const dmg = targetWeapon ? targetWeapon.damage : 0;
            const res = applyBrawlDamage(battle, target, attacker, dmg, deps, currentRng);
            attacker = res.targetNext;
            log.push(...res.log);
            if (res.movementEvent) events.push(res.movementEvent);
            currentRng = res.nextRng;
            if (attacker.status === 'casualty') break;
        }

        // 5. Update State & Loop Check
        if (attacker.status === 'casualty' || target.status === 'casualty') {
            brawlEnded = true;
        } else {
            // Pushback logic
            const loser = winnerId === attackerId ? target : (winnerId === targetId ? attacker : null);
            // Tie -> Defender pushed (V1 logic)
            const participantToPush = loser || target;
            const otherParticipant = participantToPush.id === attackerId ? target : attacker;
            
            const originalPos = { ...participantToPush.position };
            // Use initial battle for occupancy check + updated participants positions
            // Pass current [attacker, target] to ensure dynamic occupancy check
            const pushPos = calculatePushback(otherParticipant.position, participantToPush.position, battle, [attacker, target]);
            
            if (pushPos) {
                participantToPush.position = pushPos;
                // Update local var reference to ensure consistency (already done via mutation of local obj)
                
                events.push({ 
                    type: 'PARTICIPANT_MOVED', 
                    participantId: participantToPush.id, 
                    from: originalPos, 
                    to: pushPos 
                });
                log.push({ key: 'log.info.pushedBack', params: { name: participantToPush.name }});
                brawlEnded = true; // Pushback success ends brawl
            } else {
                log.push({ key: 'log.info.brawlTrappedCannotPush', params: { name: participantToPush.name }});
                // Brawl NOT ended. Loop continues.
            }
        }
        
        loopCounter++;
    }

    attacker.actionsRemaining = Math.max(0, attacker.actionsRemaining - 1);
    const currentActions = attacker.actionsTaken ?? { move: false, combat: false, dash: false, interact: false };
    attacker.actionsTaken = { ...currentActions, combat: true };

    let nextParticipants = [...battle.participants];
    nextParticipants[attackerIndex] = attacker;
    nextParticipants[targetIndex] = target;

    events.push({ 
        type: 'BRAWL_RESOLVED', 
        attackerId, 
        targetId, 
        winnerId: attacker.status === 'casualty' ? targetId : (target.status === 'casualty' ? attackerId : lastWinnerId), 
        loserId: attacker.status === 'casualty' ? attackerId : (target.status === 'casualty' ? targetId : lastLoserId)
    });

    return {
        next: {
            ...state,
            battle: {
                ...battle,
                participants: nextParticipants
            },
            rng: currentRng
        },
        events,
        log
    };
}
