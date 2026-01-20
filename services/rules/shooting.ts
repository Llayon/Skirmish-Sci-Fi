

import { Battle, BattleParticipant, Weapon, MultiplayerRole, LogEntry, ShootingContext, AfterActionContext } from '../../types';
import { getWeaponById, getProtectiveDeviceById, getUtilityDeviceById } from '../data/items';
import { rollD6 } from '../utils/rolls';
import { distance, findDodgePosition } from '../gridUtils';
import { fireHook } from '../traitSystem';
import { BattleDomain } from '../domain/battleDomain';
import { hasLineOfSight, calculateCover } from './visibility';
import { applyHitAndSaves } from './damage';
import { isOpponent as isParticipantOpponent } from '../participantUtils';

export const getValidShootTargets = (attacker: BattleParticipant, weaponId: string, battle: Battle, multiplayerRole: MultiplayerRole | null): BattleParticipant[] => {
    return BattleDomain.getValidShootTargets(attacker, weaponId, battle, multiplayerRole);
};


export const resolveShooting = (
    attacker: BattleParticipant,
    initialDefender: BattleParticipant,
    weapon: Weapon,
    battle: Battle,
    isAimed: boolean,
    isAreaBonusShot: boolean = false,
    multiplayerRole: MultiplayerRole | null
): LogEntry[] => {
    const logEntries: LogEntry[] = [];
    let volleyEndedEarly = false;
    
    if (!isAreaBonusShot) {
        logEntries.push({ 
            key: isAimed ? 'log.action.shootsAimed' : 'log.action.shoots', 
            params: { attacker: attacker.name, defender: initialDefender.name, weapon: weapon.id } 
        });
    }
    
    let currentTarget = initialDefender;

    for (let i = 0; i < weapon.shots; i++) {
        if (volleyEndedEarly) break;

        const attackerRef = battle.participants.find(p => p.id === attacker.id);
        if (!attackerRef || attackerRef.status === 'casualty') break;

        let defenderRef = battle.participants.find(p => p.id === currentTarget.id);
        
        if (!defenderRef || defenderRef.status === 'casualty') {
            if (weapon.traits.includes('focused')) {
                logEntries.push({ key: 'log.info.focusedPreventsSwitch' });
                break;
            }
            const potentialNewTargets = battle.participants.filter(p => {
                const isOpponent = multiplayerRole ? !p.id.startsWith(multiplayerRole) : p.type !== attackerRef!.type;
                return isOpponent && p.status !== 'casualty' && p.id !== attackerRef!.id &&
                distance(p.position, currentTarget.position) <= 3 &&
                hasLineOfSight(attackerRef!, p, battle);
            }).sort((a,b) => distance(attackerRef!.position, a.position) - distance(attackerRef!.position, b.position));

            if (potentialNewTargets.length > 0) {
                currentTarget = potentialNewTargets[0];
                logEntries.push({ key: 'log.info.targetDownSwitchFire', params: { attacker: attackerRef.name, target: currentTarget.name }});
                defenderRef = battle.participants.find(p => p.id === currentTarget.id)!;
            } else {
                logEntries.push({ key: 'log.info.targetEliminatedNoTargets' });
                break;
            }
        }
        
        const positionBeforeThisShot = { ...defenderRef.position };

        logEntries.push({ key: 'log.info.resolvingShot', params: { shotNum: i + 1, target: currentTarget.name }});
        
        const { targetNumber, reasonKey } = BattleDomain.calculateHitTargetNumber(attackerRef, defenderRef, weapon, battle);
        
        let roll = rollD6();
        let rerolledText = '';
        if (isAimed && roll === 1) {
            const newRoll = rollD6();
            rerolledText = ` (Rerolled 1 -> ${newRoll})`;
            roll = newRoll;
        }
        
        const attackerEffectiveStats = BattleDomain.calculateEffectiveStats(attackerRef, 'shooting');

        if (attackerRef.specialAbilities?.includes('hulker_rules')) {
            logEntries.push({ key: 'log.trait.hulkerShooting', traitId: 'hulker_rules', params: { name: attackerRef.name }});
        }

        const shootingContext: ShootingContext = {
            battle: battle, log: logEntries, attacker: attackerRef, target: defenderRef, weapon, isAimed,
            roll: { base: roll, bonus: attackerEffectiveStats.combat, final: 0, targetNumber, isHit: false, rerolledText },
            hitsToResolve: 1
        };
        
        const stillEffect = attackerRef.activeEffects.find(e => e.sourceId === 'still');
        if (stillEffect) {
            shootingContext.roll.bonus += 1;
            logEntries.push({ key: 'log.trait.stillBonus', params: { name: attackerRef.name }});
        }

        // Check for Sonic Emitter
        const emitterWearer = battle.participants.find(p =>
            p.type === 'character' &&
            p.utilityDevices?.includes('sonic_emitter') &&
            isParticipantOpponent(attackerRef, p, multiplayerRole) &&
            distance(attackerRef.position, p.position) <= 5
        );

        if (emitterWearer) {
            shootingContext.roll.bonus -= 1;
            logEntries.push({ key: 'log.trait.sonicEmitterDebuff', params: { attackerName: attackerRef.name, emitterName: emitterWearer.name } });
        }
        
        const hasReflectiveDust = battle.worldTraits?.some(t => t.id === 'reflective_dust');
        if (hasReflectiveDust) {
            const AFFECTED_WEAPONS = ['beam_pistol', 'blast_pistol', 'blast_rifle', 'fury_rifle', 'hand_laser', 'hyper_blaster', 'infantry_laser', 'plasma_rifle'];
            const dist = distance(attackerRef.position, defenderRef.position);
            if (AFFECTED_WEAPONS.includes(weapon.id) && dist > 9) {
                shootingContext.roll.bonus -= 1;
                logEntries.push({ key: 'log.info.worldTraitReflectiveDust' });
            }
        }
        
        const hasFog = battle.worldTraits?.some(t => t.id === 'fog');
        if (hasFog) {
            const dist = distance(attackerRef.position, defenderRef.position);
            if (dist > 8) {
                shootingContext.roll.bonus -= 1;
                logEntries.push({ key: 'log.info.worldTraitFog' });
            }
        }
        
        const defenderArmor = getProtectiveDeviceById(defenderRef.armor);
        const defenderTraits = defenderArmor?.traits || [];
        const attackerUtilityTraits = attackerRef.type === 'character' ? (attackerRef.utilityDevices || []).flatMap(dId => getUtilityDeviceById(dId)?.traits || []) : [];
        fireHook('onShootingRoll', shootingContext, [...weapon.traits, ...defenderTraits, ...attackerUtilityTraits]);

        shootingContext.roll.final = shootingContext.roll.base + shootingContext.roll.bonus;
        shootingContext.roll.isHit = shootingContext.roll.final >= shootingContext.roll.targetNumber;
        
        logEntries.push({ key: 'log.info.targetNumber', params: { targetNum: shootingContext.roll.targetNumber, reason: reasonKey }});
        logEntries.push({ key: 'log.info.rollInfo', params: { roll: shootingContext.roll.base, reroll: shootingContext.roll.rerolledText, combat: attackerRef.stats.combat, bonus: shootingContext.roll.bonus - attackerRef.stats.combat, total: shootingContext.roll.final }});
        
        if (shootingContext.roll.isHit) {
            logEntries.push({ key: 'log.info.hit' });
            for (let h = 0; h < shootingContext.hitsToResolve; h++) {
                if (volleyEndedEarly) break;

                const currentDefenderForHit = battle.participants.find(p => p.id === defenderRef!.id);
                if (!currentDefenderForHit || currentDefenderForHit.status === 'casualty') break;

                const weaponForHit = { ...weapon };
                if (weaponForHit.traits.includes('shock_attachment_impact') && distance(attackerRef.position, defenderRef.position) <= 8) {
                    weaponForHit.traits.push('impact');
                }

                const hitResultLog = applyHitAndSaves(battle, attackerRef, currentDefenderForHit, weaponForHit, true);
                if (hitResultLog) {
                    logEntries.push(...hitResultLog);
                }
            }

            const defenderAfterShot = battle.participants.find(p => p.id === defenderRef!.id);
            if (defenderAfterShot && (defenderAfterShot.position.x !== positionBeforeThisShot.x || defenderAfterShot.position.y !== positionBeforeThisShot.y)) {
                const attackerForNextShot = battle.participants.find(p => p.id === attacker.id);
                if (attackerForNextShot) {
                    const nextShotWeaponRange = typeof weapon.range === 'number' ? weapon.range : 0;
                    if (!hasLineOfSight(attackerForNextShot, defenderAfterShot, battle) || distance(attackerForNextShot.position, defenderAfterShot.position) > nextShotWeaponRange) {
                        logEntries.push({ key: 'log.info.luckDodgeEscaped', params: { name: defenderAfterShot.name } });
                        volleyEndedEarly = true;
                    }
                }
            }
        } else {
            logEntries.push({ key: 'log.info.miss' });
        }
    }
    
    if (!isAreaBonusShot) {
        const finalAttacker = battle.participants.find(p => p.id === attacker.id);
        if (finalAttacker) { // Check if attacker still exists
            const afterActionContext: AfterActionContext = {
                battle: battle, log: logEntries, attacker: finalAttacker, initialTarget: initialDefender, weapon
            };
            fireHook('afterAction', afterActionContext, weapon.traits);
        }
    }
    
    return logEntries;
};