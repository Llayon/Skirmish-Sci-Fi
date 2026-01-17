import { TraitPlugin } from '../../types';
import { distance } from '../gridUtils';
import { rollD6 } from '../utils/rolls';
import { calculateCover } from '../rules/visibility';

export const shootingTraits: TraitPlugin[] = [
    {
        id: 'heavy',
        priority: 100,
        hooks: {
            onShootingRoll: (ctx) => {
                if (ctx.attacker.specialAbilities?.includes('hulker_rules')) return;

                if (ctx.attacker.actionsTaken.move) {
                    ctx.roll.bonus -= 1;
                    ctx.log.push({ key: 'log.trait.heavyPenalty', traitId: 'heavy', params: { name: ctx.attacker.name } });
                }
            }
        }
    },
    {
        id: 'snap_shot',
        priority: 100,
        hooks: {
            onShootingRoll: (ctx) => {
                if (ctx.attacker.specialAbilities?.includes('hulker_rules')) return;
                
                if (distance(ctx.attacker.position, ctx.target.position) <= 6) {
                    ctx.roll.bonus += 1;
                    ctx.log.push({ key: 'log.trait.snapShotBonus', traitId: 'snap_shot' });
                }
            }
        }
    },
    {
        id: 'stealth_gear_long_range_penalty',
        priority: 100,
        hooks: {
            onShootingRoll: (ctx) => {
                if (distance(ctx.attacker.position, ctx.target.position) > 9) {
                    ctx.roll.bonus -= 1;
                    ctx.log.push({ key: 'log.trait.stealthPenalty', traitId: 'stealth_gear_long_range_penalty', params: { name: ctx.target.name } });
                }
            }
        }
    },
    {
        id: 'unity_battle_sight',
        priority: 100,
        hooks: {
            onShootingRoll: (ctx) => {
                if (ctx.attacker.specialAbilities?.includes('hulker_rules')) return;
                ctx.roll.bonus += 1;
                ctx.log.push({ key: 'log.trait.unityBattleSightBonus', traitId: 'unity_battle_sight' });
            }
        }
    },
    {
        id: 'tracker_sight',
        priority: 100,
        hooks: {
            onShootingRoll: (ctx) => {
                if (ctx.attacker.specialAbilities?.includes('hulker_rules')) return;
                if (ctx.attacker.lastTargetId && ctx.attacker.lastTargetId === ctx.target.id) {
                    ctx.roll.bonus += 1;
                    ctx.log.push({ key: 'log.trait.trackerSightBonus', traitId: 'tracker_sight' });
                }
            }
        }
    },
    {
        id: 'quality_sight_reroll',
        priority: 16, // Run after aim reroll but before most other bonuses
        hooks: {
            onShootingRoll: (ctx) => {
                if (ctx.weapon.shots === 1 && ctx.roll.base === 1 && !ctx.roll.rerolledText) {
                    const oldRoll = ctx.roll.base;
                    const newRoll = rollD6();
                    ctx.roll.rerolledText = ` (QS Rerolled ${oldRoll} -> ${newRoll})`;
                    ctx.roll.base = newRoll;
                    ctx.log.push({ key: 'log.trait.qualitySightReroll', traitId: 'quality_sight_reroll', params: { name: ctx.attacker.name, oldRoll, newRoll } });
                }
            }
        }
    },
    {
        id: 'seeker_sight_bonus',
        priority: 101, // Run after heavy penalty
        hooks: {
            onShootingRoll: (ctx) => {
                if (ctx.attacker.specialAbilities?.includes('hulker_rules')) return;
                if (!ctx.attacker.actionsTaken.move) {
                    ctx.roll.bonus += 1;
                    ctx.log.push({ key: 'log.trait.seekerSightBonus', traitId: 'seeker_sight_bonus' });
                }
            }
        }
    },
    {
        id: 'critical',
        priority: 200,
        hooks: {
            onShootingRoll: (ctx) => {
                if (ctx.roll.base === 6 && ctx.roll.isHit) {
                    ctx.hitsToResolve++;
                    ctx.log.push({ key: 'log.trait.criticalHit', traitId: 'critical' });
                }
            }
        }
    },
    {
        id: 'bipod_bonus',
        priority: 102,
        hooks: {
            onShootingRoll: (ctx) => {
                const inCover = calculateCover(ctx.target, ctx.attacker, ctx.battle);
                if ((ctx.isAimed || inCover) && distance(ctx.attacker.position, ctx.target.position) > 8) {
                    ctx.roll.bonus += 1;
                    ctx.log.push({ key: 'log.trait.bipodBonus', traitId: 'bipod_bonus' });
                }
            }
        }
    },
    {
        id: 'hot_shot_overheat',
        priority: 250, // After hit is determined
        hooks: {
            onShootingRoll: (ctx) => {
                const hotShotEligible = ['blast_pistol', 'blast_rifle', 'hand_laser', 'infantry_laser'].includes(ctx.weapon.id);
                if (hotShotEligible && ctx.roll.base === 6) {
                    if (!ctx.attacker.inoperableWeapons) {
                        ctx.attacker.inoperableWeapons = [];
                    }
                    if (ctx.weapon.instanceId && !ctx.attacker.inoperableWeapons.includes(ctx.weapon.instanceId)) {
                        ctx.attacker.inoperableWeapons.push(ctx.weapon.instanceId);
                        ctx.log.push({ key: 'log.trait.hotShotOverheat', traitId: 'hot_shot_overheat', params: { weaponName: ctx.weapon.id } });
                    }
                }
            }
        }
    },
    {
        id: 'permanent_plus_one_hit',
        priority: 90,
        hooks: {
            onShootingRoll: (ctx) => {
                ctx.roll.bonus += 1;
                ctx.log.push({ key: 'log.trait.permanentHitBonus', traitId: 'permanent_plus_one_hit' });
            }
        }
    }
];