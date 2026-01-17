import { TraitPlugin } from '../../types';
import { getProtectiveDeviceById } from '../data/items';

export const savingThrowTraits: TraitPlugin[] = [
    {
        id: 'screen_generator_ranged_save',
        priority: 50, // Runs first to see if it can provide a screen save instead of armor
        hooks: {
            onSavingThrow: (ctx) => {
                const screen = ctx.target.screen ? getProtectiveDeviceById(ctx.target.screen) : undefined;
                if (ctx.isRanged && screen?.id === 'screen_generator' && !ctx.weapon.traits.includes('area')) {
                    if (ctx.save.finalTarget === null || screen.savingThrow! < ctx.save.finalTarget) {
                        ctx.save.finalTarget = screen.savingThrow!;
                        ctx.save.device = screen;
                    }
                }
            }
        }
    },
    {
        id: 'frag_vest_area_save',
        priority: 60, // Runs after screen check, modifies a specific armor save
        hooks: {
            onSavingThrow: (ctx) => {
                if (ctx.weapon.traits.includes('area') && ctx.save.device?.id === 'frag_vest') {
                    ctx.save.finalTarget = 5;
                    ctx.log.push({ key: 'log.trait.fragVestSave', traitId: 'frag_vest_area_save' });
                }
            }
        }
    },
    {
        id: 'piercing',
        priority: 100, // Runs last to check the final save type
        hooks: {
            onSavingThrow: (ctx) => {
                // Piercing only affects armor, not screens or innate armor from non-device sources
                if (ctx.save.device?.type === 'armor') {
                    ctx.save.isBypassed = true;
                    ctx.log.push({ key: 'log.trait.savePierced', traitId: 'piercing', params: { device: ctx.save.device.id } });
                }
            }
        }
    }
];
