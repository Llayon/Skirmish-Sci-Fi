import { TraitPlugin } from '../../types';
import { distance } from '../gridUtils';
import { applyHitAndSaves } from '../rules/damage';
import { rollD6 } from '../utils/rolls';
import { BattleDomain } from '../domain/battleDomain';

export const afterActionTraits: TraitPlugin[] = [
    {
        id: 'area',
        priority: 100,
        hooks: {
            afterAction: (ctx) => {
                ctx.log.push({ key: 'log.trait.areaEffect', traitId: 'area', params: { weapon: ctx.weapon.id } });
                const secondaryTargets = ctx.battle.participants.filter(p =>
                    p.id !== ctx.attacker.id &&
                    p.id !== ctx.initialTarget.id &&
                    p.status !== 'casualty' &&
                    distance(p.position, ctx.initialTarget.position) <= 2
                );

                if (secondaryTargets.length > 0) {
                    for (const target of secondaryTargets) {
                        ctx.log.push({ key: 'log.info.resolvingBonusShot', params: { target: target.name } });
                        
                        const { targetNumber, reasonKey } = BattleDomain.calculateHitTargetNumber(ctx.attacker, target, ctx.weapon, ctx.battle);
                        ctx.log.push({ key: 'log.info.targetNumber', params: { targetNum: targetNumber, reason: reasonKey } });

                        const attackerEffectiveStats = BattleDomain.calculateEffectiveStats(ctx.attacker, 'shooting');
                        const roll = rollD6();
                        const finalRoll = roll + attackerEffectiveStats.combat;
                        
                        ctx.log.push({ key: 'log.info.rollInfo', params: { roll: roll, reroll: '', combat: ctx.attacker.stats.combat, bonus: attackerEffectiveStats.combat - ctx.attacker.stats.combat, total: finalRoll }});

                        if (finalRoll >= targetNumber) {
                            ctx.log.push({ key: 'log.info.bonusShotHit' });
                            const hitLogs = applyHitAndSaves(ctx.battle, ctx.attacker, target, ctx.weapon, true) || [];
                            ctx.log.push(...hitLogs);
                        } else {
                            ctx.log.push({ key: 'log.info.bonusShotMiss' });
                        }
                    }
                } else {
                    ctx.log.push({ key: 'log.info.areaNoTargets' });
                }
            }
        }
    },
    {
        id: 'single_use',
        priority: 200,
        hooks: {
            afterAction: (ctx) => {
                const weaponIndex = ctx.attacker.weapons.findIndex(w => w.instanceId === ctx.weapon.instanceId);
                if (weaponIndex !== -1) {
                    ctx.attacker.weapons.splice(weaponIndex, 1);
                    ctx.log.push({ key: 'log.trait.singleUseConsumed', traitId: 'single_use', params: { weapon: ctx.weapon.id } });
                }
            }
        }
    }
];
