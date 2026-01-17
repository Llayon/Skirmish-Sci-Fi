

import { Battle, BattleParticipant, Weapon, LogEntry, HitContext, DamageContext, SavingThrowContext, ActiveEffect } from '../../types';
import { rollD6 } from '../utils/rolls';
import { getProtectiveDeviceById } from '../data/items';
import { findPushbackPosition, findDodgePosition } from '../gridUtils';
import { fireHook } from '../traitSystem';
import { BattleDomain } from '../domain/battleDomain';

export const applyStunAndPushback = (
    target: BattleParticipant,
    source: BattleParticipant,
    battleState: Battle,
    logEntries: LogEntry[],
    stunToAdd: number = 1
): void => {
    if (target.type === 'character' && target.implants?.includes('neural_optimization')) {
        logEntries.push({ key: 'log.trait.neuralOptimization', traitId: 'neural_optimization', params: { name: target.name } });
        return;
    }

    if (target.type === 'character' && target.implants?.includes('nerve_adjuster')) {
        const roll = rollD6();
        if (roll >= 5) {
            logEntries.push({ key: 'log.trait.nerveAdjusterSave', traitId: 'nerve_adjuster_save', params: { name: target.name, roll } });
            return;
        }
    }
    
    if (stunToAdd > 0) {
        target.stunTokens = (target.stunTokens || 0) + stunToAdd;
        target.status = 'stunned';
    }

    if (battleState.deploymentCondition?.id === 'toxic_environment' && target.status === 'stunned') {
        const savvy = target.type === 'character' ? BattleDomain.calculateEffectiveStats(target).savvy : 0;
        const roll = rollD6();
        logEntries.push({ key: 'log.deployment.toxicRoll', params: { name: target.name, roll, savvy } });
        if (roll + savvy < 4) {
            target.status = 'casualty';
            target.actionsRemaining = 0;
            logEntries.push({ key: 'log.deployment.toxicCasualty', params: { name: target.name } });
            return;
        }
    }
    
    // Eliminate mission: Target is locked down
    if (battleState.mission.type === 'Eliminate' && battleState.mission.targetEnemyId === target.id) {
        if (target.status === 'stunned' || target.status === 'dazed') {
            battleState.mission.eliminateTargetCanEscape = true;
            target.activeEffects.push({
                sourceId: 'eliminate_target_lockdown',
                sourceName: 'Target Lockdown',
                duration: 2, // Lasts for this round and the next player phase
                preventMovement: true,
            });
            logEntries.push({ key: 'log.mission.eliminate.targetPinned' });
        }
    }

    if (target.stunTokens >= 3) {
        target.status = 'casualty';
        target.actionsRemaining = 0;
        logEntries.push({ key: 'log.info.stunCollapse', params: { name: target.name } });
    } else if (stunToAdd > 0) {
        logEntries.push({ key: 'log.info.outcomeStunned' });
        const pushbackPos = findPushbackPosition(target.position, source.position, battleState);
        if (pushbackPos) {
            target.position = pushbackPos;
            logEntries.push({ key: 'log.info.pushedBack', params: { name: target.name } });
        } else {
            logEntries.push({ key: 'log.info.notPushedBack', params: { name: target.name } });
        }
    }
};

export const applyHitAndSaves = (
    battle: Battle,
    attacker: BattleParticipant, 
    target: BattleParticipant, 
    weapon: Weapon, 
    isRanged: boolean,
): LogEntry[] => {
    
    let logEntries: LogEntry[] = [];
    
    // 0. LUCK ROLL (before any other effects)
    if (target.currentLuck > 0) {
        const luckRoll = rollD6();
        
        logEntries.push({ key: 'log.info.luckCheck', params: { name: target.name, roll: luckRoll, currentLuck: target.currentLuck }});

        // Spend the luck point for making the attempt
        target.currentLuck--;

        if (luckRoll >= 4) {
            logEntries.push({ key: 'log.info.luckSuccess' });

            const { finalPos, distance: dodgeDist } = findDodgePosition(target.position, battle, target.id);
            if (finalPos.x !== target.position.x || finalPos.y !== target.position.y) {
                target.position = finalPos;
                logEntries.push({ key: 'log.info.luckDodge', params: { name: target.name, distance: dodgeDist } });
            }

            return logEntries;
        } else {
            logEntries.push({ key: 'log.info.luckFail' });
            // The point is spent, so the hit proceeds.
        }
    }
    
    // 1. ON HIT HOOKS
    const hitContext: HitContext = {
        battle: battle,
        log: logEntries,
        attacker: attacker,
        target: target,
        weapon: weapon,
        isRanged: isRanged,
        hit: { isNegated: false, skipDamage: false, applyStunAndPushback: false }
    };

    const defenderArmor = getProtectiveDeviceById(target.armor);
    const defenderScreen = getProtectiveDeviceById(target.screen);
    const defenderTraits = [
        ...(defenderArmor?.traits || []),
        ...(defenderScreen?.traits || [])
    ];
    fireHook('onHit', hitContext, [...weapon.traits, ...defenderTraits]);

    if (hitContext.hit.isNegated) {
        return logEntries;
    }
    
    if (hitContext.hit.skipDamage) {
        if(hitContext.hit.applyStunAndPushback){
            applyStunAndPushback(target, attacker, battle, logEntries, 1);
        }
        return logEntries;
    }

    // 2. SAVING THROW
    const innateSave = (target as any).innateArmorSave;
    const hasMultipleSaves = !!(defenderArmor && innateSave);
    const bestSaveTarget = Math.min(defenderArmor?.savingThrow || 7, innateSave || 7);
    
    const saveContext: SavingThrowContext = {
        battle: battle,
        log: logEntries,
        attacker: attacker,
        target: target,
        weapon: weapon,
        isRanged: isRanged,
        save: {
            device: defenderArmor || (innateSave ? { id: 'innate_armor' } as any : null),
            baseTarget: bestSaveTarget !== 7 ? bestSaveTarget : null,
            finalTarget: hasMultipleSaves && bestSaveTarget !== 7 ? bestSaveTarget - 1 : (bestSaveTarget !== 7 ? bestSaveTarget : null),
            roll: 0,
            isSuccess: false,
            isBypassed: false
        }
    };

    fireHook('onSavingThrow', saveContext, [...weapon.traits, ...defenderTraits]);
    
    if (saveContext.save.finalTarget && !saveContext.save.isBypassed) {
        saveContext.save.roll = rollD6();
        saveContext.save.isSuccess = saveContext.save.roll >= saveContext.save.finalTarget;
        const deviceName = saveContext.save.device?.id === 'innate_armor' ? 'innate armor' : saveContext.save.device!.id;
        logEntries.push({ key: 'log.info.saveCheck', params: { name: target.name, roll: saveContext.save.roll, target: saveContext.save.finalTarget, device: deviceName }});
        logEntries.push({ key: saveContext.save.isSuccess ? 'log.info.saveSuccess' : 'log.info.saveFail' });
    } else if (saveContext.save.isBypassed) {
        // Log for bypass already added by hook
    } else {
        logEntries.push({ key: 'log.info.noSave' });
    }
    
    const saveSuccessful = saveContext.save.isSuccess;
    
    // 3. DAMAGE ROLL
    const damageContext: DamageContext = {
        battle: battle,
        log: logEntries,
        attacker: attacker,
        target: target,
        weapon: weapon,
        damage: {
            baseRoll: rollD6(),
            weaponBonus: weapon.damage,
            finalDamage: 0,
            targetToughness: target.stats.toughness,
            isLethal: false,
        }
    };
    fireHook('onDamageRoll', damageContext, defenderTraits);

    damageContext.damage.finalDamage = damageContext.damage.baseRoll + damageContext.damage.weaponBonus;
    damageContext.damage.isLethal = damageContext.damage.finalDamage >= damageContext.damage.targetToughness || damageContext.damage.baseRoll === 6;

    logEntries.push({ key: 'log.info.damageRoll', params: { roll: damageContext.damage.baseRoll, damage: damageContext.damage.weaponBonus, total: damageContext.damage.finalDamage, toughness: damageContext.damage.targetToughness }});
    
    // 4. OUTCOME
    const isLethal = damageContext.damage.isLethal;

    if (saveSuccessful) {
        if (isLethal) {
            logEntries.push({ key: 'log.info.saveDowngradesHit' });
            target.status = 'stunned'; // Becomes stunned, but no token or pushback.
        } else {
            logEntries.push({ key: 'log.info.saveReducesStun' });
            // No effect for a saved non-lethal hit.
        }
    } else { // Save failed or not possible
        if (isLethal) {
            logEntries.push({ key: 'log.info.lethalHit' });
            
            const stimpackIndex = target.consumables.findIndex(cId => cId === 'stim-pack');
            if (stimpackIndex !== -1) {
                logEntries.push({ key: 'log.info.stimPackSave', params: { name: target.name }});
                target.consumables.splice(stimpackIndex, 1);
                target.stunTokens = 1;
                target.status = 'stunned';
            } else {
                if (target.type === 'enemy') {
                    battle.enemiesLostThisRound = (battle.enemiesLostThisRound || 0) + 1;
                }
                logEntries.push({ key: 'log.info.outcomeCasualty', params: { name: target.name } });
                target.status = 'casualty';
                target.actionsRemaining = 0;

                // --- ITEM DROP LOGIC ---
                const mission = battle.mission;
                if ((mission.type === 'Acquire' || mission.type === 'Deliver') && mission.itemCarrierId === target.id) {
                    const dropRoll = rollD6();
                    const missionTypeKey = mission.type.toLowerCase();
                    if (dropRoll === 1) {
                        mission.itemDestroyed = true;
                        mission.itemCarrierId = null;
                        mission.itemPosition = null;
                        logEntries.push({ key: `log.mission.${missionTypeKey}.destroyed` });
                    } else {
                        mission.itemPosition = { ...target.position };
                        mission.itemCarrierId = null;
                        logEntries.push({ key: `log.mission.${missionTypeKey}.dropped`, params: { name: target.name } });
                    }
                }
            }
        } else { // Non-lethal, save failed
            let stunToAdd = 1;
            if (weapon.traits.includes('impact')) {
                stunToAdd++;
                logEntries.push({ key: 'log.trait.impactStun', traitId: 'impact' });
            }
            applyStunAndPushback(target, attacker, battle, logEntries, stunToAdd);
        }
    }
    
    // Apply terrifying effect after all other outcomes are resolved
    const terrifiedContext: HitContext = {
      battle: battle,
      log: logEntries,
      attacker,
      target,
      weapon,
      isRanged,
      hit: {isNegated: false, skipDamage: true, applyStunAndPushback: false}
    };
    fireHook('onHit', terrifiedContext, weapon.traits.filter(t => t === 'terrifying'));

    return logEntries;
};