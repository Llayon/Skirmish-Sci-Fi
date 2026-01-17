import { TraitPlugin, ActiveEffect } from '../../types';
import { rollD6 } from '../utils/rolls';
import { distance } from '../gridUtils';

export const hitTraits: TraitPlugin[] = [
    {
        id: 'deflector_field',
        priority: 10,
        hooks: {
            onHit: (ctx) => {
                if (ctx.isRanged && !ctx.target.deflectorFieldUsedThisBattle) {
                    ctx.hit.isNegated = true;
                    ctx.target.deflectorFieldUsedThisBattle = true;
                    ctx.log.push({ key: 'log.trait.deflectorFieldNegate', traitId: 'deflector_field', params: { name: ctx.target.name } });
                }
            }
        }
    },
    {
        id: 'stun',
        priority: 50,
        hooks: {
            onHit: (ctx) => {
                ctx.hit.skipDamage = true;
                ctx.hit.applyStunAndPushback = true;
                ctx.log.push({ key: 'log.trait.stunEffect', traitId: 'stun', params: { weapon: ctx.weapon.id } });
            }
        }
    },
    // The 'impact' and 'shock_attachment_impact' logic is correctly handled in damage.ts and shooting.ts respectively.
    // The onHit hooks were redundant and potentially caused incorrect behavior by applying effects prematurely.
    {
        id: 'terrifying',
        priority: 100,
        hooks: {
            onHit: (ctx) => {
                if (!ctx.hit.isNegated) {
                    const fleeEffect: ActiveEffect = {
                        sourceId: 'terrifying',
                        sourceName: 'Panicked',
                        duration: 2,
                        fleeFrom: ctx.attacker.position,
                        fleeDistance: rollD6()
                    };
                    ctx.target.activeEffects.push(fleeEffect);
                    ctx.log.push({ key: 'log.trait.terrifyingEffect', traitId: 'terrifying', params: { weapon: ctx.weapon.id, name: ctx.target.name, distance: fleeEffect.fleeDistance! } });
                }
            }
        }
    },
];
