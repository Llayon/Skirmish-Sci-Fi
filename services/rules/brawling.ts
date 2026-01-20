import { Battle, BattleParticipant, Weapon, LogEntry, BrawlContext, MultiplayerRole } from '../../types';
import { getWeaponById } from '../data/items';
import { rollD6 } from '../utils/rolls';
import { distance, findPushbackPosition } from '../gridUtils';
import { fireHook } from '../traitSystem';
import { BattleDomain } from '../domain/battleDomain';
import { applyHitAndSaves } from './damage';

export const resolveBrawling = (
    attacker: BattleParticipant,
    initialDefender: BattleParticipant,
    attackerWeaponInstanceId: string | undefined,
    battle: Battle,
    multiplayerRole: MultiplayerRole | null
): LogEntry[] => {
    
    const log: LogEntry[] = [];
    let followUpAttackerId: string | null = null;
    let finalLoserId: string | null = null;
    const attackerInitialWeapon = attackerWeaponInstanceId ? BattleDomain.getEffectiveWeapon(attacker, attackerWeaponInstanceId) : undefined;

    const getBrawlWeapon = (participant: BattleParticipant): Weapon | undefined => {
        const effectiveWeapons = participant.weapons
            .map(cw => BattleDomain.getEffectiveWeapon(participant, cw.instanceId))
            .filter((w): w is Weapon => !!w);
    
        const meleeWep = effectiveWeapons.find(w => w.traits.includes('melee'));
        if (meleeWep) return meleeWep;
        
        const pistolWep = effectiveWeapons.find(w => w.traits.includes('pistol'));
        if (pistolWep) return pistolWep;
    
        return undefined;
    };


    // --- BRAWL ROUND HELPER ---
    const _resolveBrawlRound = (
        brawlAttacker: BattleParticipant, 
        brawlDefender: BattleParticipant,
        isOutnumberedCheck: boolean
    ): { log: LogEntry[], winnerId: string | null, loserId: string | null } => {
        const roundLog: LogEntry[] = [];
        let winnerId: string | null = null;
        let loserId: string | null = null;

        const attackerOriginalPos = { ...brawlAttacker.position };
        const defenderOriginalPos = { ...brawlDefender.position };

        let combatLoopCounter = 0;
        let brawlEnded = false;
        
        const applyBrawlHits = (targetId: string, sourceId: string, hits: number, weapon: Weapon | undefined): boolean => {
            if (hits <= 0) return true;
        
            const source = battle.participants.find(p => p.id === sourceId);
            const initialTarget = battle.participants.find(p => p.id === targetId);
            if (!source || !initialTarget) return true;
        
            roundLog.push({ key: 'log.info.brawlTakesHits', params: { name: initialTarget.name, hits }});
        
            for (let i = 0; i < hits; i++) {
                // Re-find the target in the current battle state before each hit to ensure we have the latest data
                const currentTarget = battle.participants.find(p => p.id === targetId);
                if (!currentTarget || currentTarget.status === 'casualty') {
                    return false; // Stop if target is down
                }
                const hitLog = applyHitAndSaves(battle, source, currentTarget, weapon || {id: 'unarmed', range: 'brawl', shots: 0, damage: 0, traits: []}, false);
                roundLog.push(...hitLog);
            }
            return true;
        };

        while(combatLoopCounter < 5 && !brawlEnded) {
            let attackerRef = battle.participants.find(p => p.id === brawlAttacker.id)!;
            let defenderRef = battle.participants.find(p => p.id === brawlDefender.id)!;
            
            if (!attackerRef || !defenderRef || distance(attackerRef.position, defenderRef.position) > 1 || attackerRef.status === 'casualty' || defenderRef.status === 'casualty') {
                brawlEnded = true;
                break;
            }

            if (combatLoopCounter > 0) {
                roundLog.push({ key: 'log.info.brawlTrapped' });
            } else {
                roundLog.push(attackerInitialWeapon 
                    ? { key: 'log.action.brawlerWeapon', params: { name: attackerRef.name, weapon: attackerInitialWeapon.id }}
                    : { key: 'log.action.brawlerUnarmed', params: { name: attackerRef.name }}
                );
                const defenderWep = getBrawlWeapon(defenderRef);
                roundLog.push(defenderWep
                    ? { key: 'log.action.brawlerWeapon', params: { name: defenderRef.name, weapon: defenderWep.id }}
                    : { key: 'log.action.brawlerUnarmed', params: { name: defenderRef.name }}
                );
            }
            
            const attackerEffectiveStats = BattleDomain.calculateEffectiveStats(attackerRef, 'brawling');
            const defenderEffectiveStats = BattleDomain.calculateEffectiveStats(defenderRef, 'brawling');

            const brawlingContext: BrawlContext = {
                battle: battle, log: roundLog, attacker: attackerRef, defender: defenderRef,
                attackerWeapon: attackerInitialWeapon,
                defenderWeapon: getBrawlWeapon(defenderRef),
                attackerRoll: { base: rollD6(), bonus: attackerEffectiveStats.combat, final: 0, rerolledText: '' },
                defenderRoll: { base: rollD6(), bonus: defenderEffectiveStats.combat, final: 0, rerolledText: '' },
                winner: null, loser: null
            };

            // K'Erin Brawl rule: Roll twice, pick best
            if (attackerRef.specialAbilities?.includes('kerin_brawl')) {
                const secondRoll = rollD6();
                if (secondRoll > brawlingContext.attackerRoll.base) {
                    roundLog.push({ key: 'log.trait.kerinBrawl', params: { name: attackerRef.name, roll1: brawlingContext.attackerRoll.base, roll2: secondRoll } });
                    brawlingContext.attackerRoll.base = secondRoll;
                }
            }
            if (defenderRef.specialAbilities?.includes('kerin_brawl')) {
                const secondRoll = rollD6();
                if (secondRoll > brawlingContext.defenderRoll.base) {
                    roundLog.push({ key: 'log.trait.kerinBrawl', params: { name: defenderRef.name, roll1: brawlingContext.defenderRoll.base, roll2: secondRoll } });
                    brawlingContext.defenderRoll.base = secondRoll;
                }
            }

            const getBrawlBonus = (weapon: Weapon | undefined): number => {
                if (!weapon) return 0;
                if (weapon.traits.includes('melee')) return 2;
                if (weapon.traits.includes('pistol')) return 1;
                return 0;
            };

            brawlingContext.attackerRoll.bonus += getBrawlBonus(brawlingContext.attackerWeapon);
            brawlingContext.defenderRoll.bonus += getBrawlBonus(brawlingContext.defenderWeapon);
            
            if (isOutnumberedCheck) {
                brawlingContext.attackerRoll.bonus -= 1; // Correction: Attacker is penalized
                if (combatLoopCounter === 0) roundLog.push({ key: 'log.info.brawlOutnumbered', params: { name: attackerRef.name } });
            }

            if (defenderRef.status === 'stunned' && defenderRef.stunTokens > 0) {
                brawlingContext.attackerRoll.bonus += defenderRef.stunTokens;
                roundLog.push({ key: 'log.info.brawlerStunBonus', params: { target: defenderRef.name, attacker: attackerRef.name, bonus: defenderRef.stunTokens }});
                defenderRef.stunTokens = 0;
                defenderRef.status = 'active';
            }
            
            const rageEffect = attackerRef.activeEffects.find(e => e.sourceId === 'rage_out');
            if (rageEffect) {
                brawlingContext.attackerRoll.bonus += 1;
                if (combatLoopCounter === 0) roundLog.push({ key: 'log.trait.rageOutBonus', traitId: 'rage_out', params: { name: attackerRef.name }});
            }

            const allTraits = [...(brawlingContext.attackerWeapon?.traits || []), ...(brawlingContext.defenderWeapon?.traits || [])];
            fireHook('onBrawlRoll', brawlingContext, allTraits);
            
            brawlingContext.attackerRoll.final = brawlingContext.attackerRoll.base + brawlingContext.attackerRoll.bonus;
            brawlingContext.defenderRoll.final = brawlingContext.defenderRoll.base + brawlingContext.defenderRoll.bonus;

            roundLog.push({ key: 'log.info.brawlRoll', params: { name: attackerRef.name, roll: brawlingContext.attackerRoll.base, reroll: brawlingContext.attackerRoll.rerolledText, combat: attackerRef.stats.combat, bonus: brawlingContext.attackerRoll.bonus - attackerRef.stats.combat, total: brawlingContext.attackerRoll.final }});
            roundLog.push({ key: 'log.info.brawlRoll', params: { name: defenderRef.name, roll: brawlingContext.defenderRoll.base, reroll: brawlingContext.defenderRoll.rerolledText, combat: defenderRef.stats.combat, bonus: brawlingContext.defenderRoll.bonus - defenderRef.stats.combat, total: brawlingContext.defenderRoll.final }});

            let winnerRef: BattleParticipant | null = null;
            let loserRef: BattleParticipant | null = null;

            if (brawlingContext.attackerRoll.final > brawlingContext.defenderRoll.final) {
                winnerRef = attackerRef;
                loserRef = defenderRef;
                roundLog.push({ key: 'log.info.brawlWinner', params: { name: winnerRef.name } });
            } else if (brawlingContext.defenderRoll.final > brawlingContext.attackerRoll.final) {
                winnerRef = defenderRef;
                loserRef = attackerRef;
                roundLog.push({ key: 'log.info.brawlWinner', params: { name: winnerRef.name } });
            } else {
                roundLog.push({ key: 'log.info.brawlTie' });
            }
            
            let attackerHits = (winnerRef === defenderRef || !winnerRef) ? 1 : 0;
            let defenderHits = (winnerRef === attackerRef || !winnerRef) ? 1 : 0;

            if (brawlingContext.attackerRoll.base === 1) { attackerHits++; roundLog.push({ key: 'log.info.brawlFumble', params: { name: attackerRef.name }}); }
            if (brawlingContext.attackerRoll.base === 6) { defenderHits++; roundLog.push({ key: 'log.info.brawlCrit', params: { name: attackerRef.name }}); }
            if (brawlingContext.defenderRoll.base === 1) { defenderHits++; roundLog.push({ key: 'log.info.brawlFumble', params: { name: defenderRef.name }}); }
            if (brawlingContext.defenderRoll.base === 6) { attackerHits++; roundLog.push({ key: 'log.info.brawlCrit', params: { name: defenderRef.name }}); }
            
            if (defenderHits > 0) { // Attacker's hits on defender
                applyBrawlHits(defenderRef.id, attackerRef.id, defenderHits, brawlingContext.attackerWeapon);
            }
            if (attackerHits > 0) { // Defender's hits on attacker
                applyBrawlHits(attackerRef.id, defenderRef.id, attackerHits, brawlingContext.defenderWeapon);
            }

            attackerRef = battle.participants.find(p => p.id === brawlAttacker.id)!;
            defenderRef = battle.participants.find(p => p.id === brawlDefender.id)!;
            
            if (attackerRef.status === 'casualty' || defenderRef.status === 'casualty') {
                if (attackerRef.status !== 'casualty' && defenderRef.status === 'casualty') {
                    winnerId = attackerRef.id;
                    loserId = defenderRef.id;
                } else if (defenderRef.status !== 'casualty' && attackerRef.status === 'casualty') {
                    winnerId = defenderRef.id;
                    loserId = attackerRef.id;
                }
                brawlEnded = true;
            } else {
                const combatantToPush = loserRef ? (loserRef.id === attackerRef.id ? attackerRef : defenderRef) : defenderRef;
                const otherCombatant = combatantToPush.id === attackerRef.id ? defenderRef : attackerRef;
            
                const pushbackPos = findPushbackPosition(combatantToPush.position, otherCombatant.position, battle);
                if (pushbackPos) {
                    combatantToPush.position = pushbackPos;
                    roundLog.push({ key: 'log.info.pushedBack', params: { name: combatantToPush.name }});
                    brawlEnded = true;
                } else {
                    roundLog.push({key: 'log.info.brawlTrappedCannotPush', params: {name: combatantToPush.name}});
                }
            }
            
            combatLoopCounter++;
        }
        
        return { log: roundLog, winnerId, loserId };
    };

    // --- MAIN BRAWL LOGIC ---
    log.push({ key: 'log.action.brawls', params: { attacker: attacker.name, defender: initialDefender.name } });

    // Identify all participants in the brawl
    const opponents = battle.participants.filter(p => {
        const isOpponent = multiplayerRole ? !p.id.startsWith(multiplayerRole) : p.type !== attacker.type;
        return isOpponent && p.status !== 'casualty' && distance(p.position, attacker.position) <= 1;
    });

    if (opponents.length > 2) {
        log.push({ key: 'log.info.brawlTooManyOpponents'});
        // Push back one of the defenders to simplify to a 2v1 or 1v1
        const defenderToPush = opponents.find(o => o.id !== initialDefender.id)!;
        const pushPos = findPushbackPosition(defenderToPush.position, attacker.position, battle);
        if (pushPos) {
            defenderToPush.position = pushPos;
            log.push({ key: 'log.info.brawlPushedOpponent', params: { name: defenderToPush.name }});
        } else {
             log.push({ key: 'log.info.brawlCannotPushOpponent', params: { name: defenderToPush.name }});
        }
    }
    
    // Re-evaluate opponents after pushback
    const finalOpponents = battle.participants.filter(p => {
        const isOpponent = multiplayerRole ? !p.id.startsWith(multiplayerRole) : p.type !== attacker.type;
        return isOpponent && p.status !== 'casualty' && distance(p.position, attacker.position) <= 1;
    });
    
    if (finalOpponents.length === 1) { // 1v1 Brawl
        const { log: roundLog, winnerId, loserId } = _resolveBrawlRound(attacker, finalOpponents[0], false);
        log.push(...roundLog);
        if (winnerId === attacker.id) {
            followUpAttackerId = attacker.id;
            finalLoserId = loserId;
        } else if (winnerId === finalOpponents[0].id) {
            // No follow up for defender
        }
    } else if (finalOpponents.length === 2) { // 1v2 Brawl
        const firstOpponent = finalOpponents.find(o => o.id === initialDefender.id) || finalOpponents[0];
        const secondOpponent = finalOpponents.find(o => o.id !== firstOpponent.id)!;

        // Round 1: Attacker vs First Opponent (outnumbered)
        const { log: round1Log, winnerId: winner1Id } = _resolveBrawlRound(attacker, firstOpponent, true);
        log.push(...round1Log);
        
        const attackerAfterR1 = battle.participants.find(p => p.id === attacker.id)!;
        if (attackerAfterR1.status !== 'casualty' && winner1Id === attacker.id) {
            // Attacker won, now must fight second opponent
            log.push({ key: 'log.info.brawlSecondOpponent', params: { name: secondOpponent.name }});
            const { log: round2Log, winnerId: winner2Id, loserId: loser2Id } = _resolveBrawlRound(attackerAfterR1, secondOpponent, false);
            log.push(...round2Log);
            if (winner2Id === attacker.id) {
                followUpAttackerId = attacker.id;
                finalLoserId = loser2Id;
            }
        }
    }

    if (followUpAttackerId) {
        const winner = battle.participants.find(p => p.id === followUpAttackerId)!;
        const loser = battle.participants.find(p => p.id === finalLoserId);
        if (winner && loser) {
            // Winner can move up to 2 spaces.
            battle.followUpState = {
                participantId: winner.id,
                maxMove: 2,
            };
            log.push({ key: 'log.info.brawlFollowUp', params: { winner: winner.name, loser: loser.name } });
        }
    }

    return log;
};