/**
 * Domain layer service for core battle business logic.
 * To be implemented in Phase 2.
 */
import { Battle, BattleParticipant, CharacterStats, ActiveEffect, MultiplayerRole, Position, Terrain, Weapon, CharacterWeapon, Implant } from '../../types';
import { getProtectiveDeviceById, getWeaponById, getGunModById, getGunSightById, getImplantById, getUtilityDeviceById } from '../data/items';
import { distance } from '../gridUtils';
import { isOpponent } from '../participantUtils';
import { hasLineOfSight, calculateCover } from '../rules/visibility';


/**
 * Contains pure, stateless business logic for battle calculations and rules.
 * No side effects, no state mutations.
 */
export class BattleDomain {

    static getEffectiveWeapon(participant: BattleParticipant, weaponInstanceId: string): Weapon | undefined {
        const charWeapon = participant.weapons.find(cw => cw.instanceId === weaponInstanceId);
        if (!charWeapon) return undefined;

        const baseWeapon = getWeaponById(charWeapon.weaponId);
        if (!baseWeapon) return undefined;

        const effectiveWeapon: Weapon = { ...baseWeapon, instanceId: charWeapon.instanceId, modId: charWeapon.modId, sightId: charWeapon.sightId };
        
        let traits = [...baseWeapon.traits];

        // Apply mod traits
        if (charWeapon.modId) {
            const mod = getGunModById(charWeapon.modId);
            if (mod?.traits) {
                traits.push(...mod.traits);
            }
        }

        // Apply sight traits
        if (charWeapon.sightId) {
            const sight = getGunSightById(charWeapon.sightId);
            if (sight?.traits) {
                traits.push(...sight.traits);
            }
        }
        
        // Make traits unique
        traits = [...new Set(traits)];

        // Swift volley rule
        if ((participant as any).specialAbilities?.includes('swift_volley') && baseWeapon.shots > 1) {
            if (!traits.includes('focused')) {
                traits.push('focused');
            }
        }

        // Hulker specific rule
        if ((participant as any).specialAbilities?.includes('hulker_rules')) {
            traits = traits.filter(t => t !== 'clumsy' && t !== 'heavy');
        }

        // Stabilizer mod rule
        if (traits.includes('ignores_heavy')) {
            traits = traits.filter(t => t !== 'heavy');
        }

        effectiveWeapon.traits = traits;
        
        // Apply direct stat changes from traits
        if (traits.includes('quality_sight_range')) {
            if (typeof effectiveWeapon.range === 'number') {
                effectiveWeapon.range += 2;
            }
        }

        if (traits.includes('range_increase_2') && typeof effectiveWeapon.range === 'number') {
            effectiveWeapon.range += 2;
        }

        const hotShotEligible = ['blast_pistol', 'blast_rifle', 'hand_laser', 'infantry_laser'].includes(baseWeapon.id);
        if (traits.includes('hot_shot_damage') && hotShotEligible) {
            effectiveWeapon.damage += 1;
        }

        if (traits.includes('damage_plus_one')) {
            effectiveWeapon.damage += 1;
        }

        // Boosted Arm implant
        if (participant.type === 'character' && participant.implants?.includes('boosted_arm')) {
             if (baseWeapon.traits.includes('single_use') && (baseWeapon.id.includes('grenade') || baseWeapon.traits.includes('area')) && typeof effectiveWeapon.range === 'number') {
                effectiveWeapon.range += 2;
            }
        }


        return effectiveWeapon;
    }


    /**
     * Calculates a participant's stats including bonuses from persistent gear and active effects.
     */
    static calculateEffectiveStats(participant: BattleParticipant, context: 'display' | 'reaction_roll' | 'shooting' | 'brawling' = 'display'): CharacterStats {
        const newStats: CharacterStats = { ...participant.stats };

        const armor = participant.armor ? getProtectiveDeviceById(participant.armor) : undefined;
        if (armor?.traits?.includes('battle_dress_reactions')) {
            newStats.reactions = Math.min(4, newStats.reactions + 1);
        }

        if (participant.type === 'character' && Array.isArray(participant.implants)) {
            participant.implants.forEach(implantId => {
                const implantData = getImplantById(implantId);
                if (implantData?.statModifiers) {
                    (Object.keys(implantData.statModifiers) as Array<keyof CharacterStats>).forEach(stat => {
                        newStats[stat] = (newStats[stat] || 0) + (implantData.statModifiers![stat] || 0);
                    });
                }
            });
        }
        
        if (context !== 'reaction_roll') {
            participant.activeEffects.forEach((effect: ActiveEffect) => {
                if (effect.statModifiers) {
                    (Object.keys(effect.statModifiers) as Array<keyof CharacterStats>).forEach(stat => {
                        if (newStats[stat] !== undefined) {
                          newStats[stat] = (newStats[stat] || 0) + (effect.statModifiers![stat] || 0);
                        }
                    });
                }
            });
        }

        if (context === 'shooting' && participant.specialAbilities?.includes('hulker_rules')) {
            newStats.combat = 0;
        }
        
        if (participant.type === 'character' && participant.utilityDevices?.includes('robo_rabbits_foot') && newStats.luck === 0) {
            newStats.luck = 1;
        }

        return newStats;
    }

    /**
     * Determines if a participant is engaged in melee combat (adjacent to an opponent).
     */
    static isEngaged(
      participant: BattleParticipant,
      participants: BattleParticipant[],
      multiplayerRole: MultiplayerRole | null
    ): boolean {
      return participants.some(other => {
        if (other.id === participant.id || other.status === 'casualty') return false;
        return isOpponent(participant, other, multiplayerRole) && distance(participant.position, other.position) <= 1;
      });
    }

    /**
     * Determines the target number needed for a successful ranged attack.
     */
    static calculateHitTargetNumber(attacker: BattleParticipant, target: BattleParticipant, weapon: Weapon, battle: Battle): { targetNumber: number, reasonKey: string } {
        const dist = distance(attacker.position, target.position);
        const inCover = calculateCover(attacker, target, battle);
        const weaponRange = typeof weapon.range === 'number' ? weapon.range : 0;

        if (dist > weaponRange) return { targetNumber: 99, reasonKey: 'log.info.outOfRange' };
        if (dist <= 6 && !inCover) return { targetNumber: 3, reasonKey: 'log.info.targetReasonShortOpen' };
        if ((dist <= weaponRange && !inCover) || (dist <= 6 && inCover)) return { targetNumber: 5, reasonKey: 'log.info.targetReasonLongOpenOrShortCover' };
        return { targetNumber: 6, reasonKey: 'log.info.targetReasonLongCover' };
    }

    /**
     * Finds all valid targets a participant can shoot at with a given weapon.
     */
    static getValidShootTargets(attacker: BattleParticipant, weaponId: string, battle: Battle, multiplayerRole: MultiplayerRole | null): BattleParticipant[] {
        const allOpponents = battle.participants.filter(p => {
            if (p.status === 'casualty' || p.id === attacker.id) return false;
            return isOpponent(attacker, p, multiplayerRole);
        });

        const isEngaged = allOpponents.some(o => distance(attacker.position, o.position) <= 1);
        if (isEngaged) return [];

        const weapon = getWeaponById(weaponId);
        if (!weapon || typeof weapon.range !== 'number') return [];
        
        const range = weapon.range;
        const nearbyVisibleOpponents = allOpponents.filter(o => distance(attacker.position, o.position) <= 3 && hasLineOfSight(attacker, o, battle));

        let potentialTargets: BattleParticipant[];
        if (nearbyVisibleOpponents.length > 0) {
            potentialTargets = nearbyVisibleOpponents;
        } else {
            potentialTargets = allOpponents.filter(o => hasLineOfSight(attacker, o, battle));
        }

        return potentialTargets.filter(t => distance(attacker.position, t.position) <= range);
    }
}