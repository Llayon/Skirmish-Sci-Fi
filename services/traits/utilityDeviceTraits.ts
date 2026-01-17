import { TraitPlugin } from '../../types';
import { rollD6 } from '../utils/rolls';

export const utilityDeviceTraits: TraitPlugin[] = [
    {
        id: 'reroll_shooting_ones',
        priority: 15, // Runs after Aimed Shot reroll but before most other bonuses
        hooks: {
            onShootingRoll: (ctx) => {
                if (ctx.attacker.utilityDevices?.includes('battle_visor') && ctx.roll.base === 1 && !ctx.roll.rerolledText) {
                    const oldRoll = ctx.roll.base;
                    const newRoll = rollD6();
                    ctx.roll.rerolledText = ` (Rerolled ${oldRoll} -> ${newRoll})`;
                    ctx.roll.base = newRoll;
                    ctx.log.push({ key: 'log.trait.battleVisorReroll', traitId: 'reroll_shooting_ones', params: { name: ctx.attacker.name, oldRoll, newRoll } });
                }
            }
        }
    }
];