import { TraitPlugin, ActiveEffect } from '../../types';

export const damageTraits: TraitPlugin[] = [
    {
        id: 'flak_screen_damage_reduction',
        priority: 100,
        hooks: {
            onDamageRoll: (ctx) => {
                if (ctx.weapon.traits.includes('area')) {
                    ctx.damage.weaponBonus = Math.max(0, ctx.damage.weaponBonus - 1);
                    ctx.log.push({ key: 'log.trait.flakScreenReduction', traitId: 'flak_screen_damage_reduction', params: { name: ctx.target.name } });
                }
            }
        }
    },
    {
        id: 'flex_armor_toughness',
        priority: 100,
        hooks: {
            onDamageRoll: (ctx) => {
                if (!ctx.target.actionsTaken.move) {
                    ctx.damage.targetToughness = Math.min(6, ctx.damage.targetToughness + 1);
                    ctx.log.push({ key: 'log.trait.flexArmorToughness', traitId: 'flex_armor_toughness', params: { name: ctx.target.name, toughness: ctx.damage.targetToughness } });
                }
            }
        }
    }
];
