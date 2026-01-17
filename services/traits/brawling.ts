import { TraitPlugin, BattleParticipant } from '../../types';
import { rollD6 } from '../utils/rolls';

export const brawlingTraits: TraitPlugin[] = [
    {
        id: 'clumsy',
        priority: 100,
        hooks: {
            onBrawlRoll: (ctx) => {
                if (ctx.attacker.specialAbilities?.includes('hulker_rules')) return;

                const getEffectiveSpeed = (p: BattleParticipant) => p.stats.speed + (p.activeEffects.find(e => e.sourceId === 'rage_out')?.statModifiers?.speed || 0);
                const attackerSpeed = getEffectiveSpeed(ctx.attacker);
                const defenderSpeed = getEffectiveSpeed(ctx.defender);

                if (ctx.attackerWeapon?.traits.includes('clumsy') && defenderSpeed > attackerSpeed) {
                    ctx.attackerRoll.bonus -= 1;
                    ctx.log.push({ key: 'log.trait.clumsyPenalty', traitId: 'clumsy', params: { name: ctx.attacker.name } });
                }
                if (ctx.defenderWeapon?.traits.includes('clumsy') && attackerSpeed > defenderSpeed) {
                    ctx.defenderRoll.bonus -= 1;
                    ctx.log.push({ key: 'log.trait.clumsyPenalty', traitId: 'clumsy', params: { name: ctx.defender.name } });
                }
            }
        }
    },
    {
        id: 'elegant',
        priority: 10,
        hooks: {
            onBrawlRoll: (ctx) => {
                // Correctly calculate initial totals. The .bonus property already includes the combat stat.
                const initialAttackerTotal = ctx.attackerRoll.base + ctx.attackerRoll.bonus;
                const initialDefenderTotal = ctx.defenderRoll.base + ctx.defenderRoll.bonus;

                if (ctx.attackerWeapon?.traits.includes('elegant') && initialAttackerTotal < initialDefenderTotal) {
                    const oldRoll = ctx.attackerRoll.base;
                    const newRoll = rollD6();
                    ctx.attackerRoll.rerolledText = ` (Rerolled ${oldRoll} -> ${newRoll})`;
                    ctx.attackerRoll.base = newRoll;
                    ctx.log.push({ key: 'log.trait.elegantReroll', traitId: 'elegant', params: { name: ctx.attacker.name, oldRoll, newRoll } });
                }
                
                // Use the original attacker total for the defender's check to prevent cascading rerolls.
                if (ctx.defenderWeapon?.traits.includes('elegant') && initialDefenderTotal < initialAttackerTotal) {
                    const oldRoll = ctx.defenderRoll.base;
                    const newRoll = rollD6();
                    ctx.defenderRoll.rerolledText = ` (Rerolled ${oldRoll} -> ${newRoll})`;
                    ctx.defenderRoll.base = newRoll;
                    ctx.log.push({ key: 'log.trait.elegantReroll', traitId: 'elegant', params: { name: ctx.defender.name, oldRoll, newRoll } });
                }
            }
        }
    },
    {
        id: 'brawl_tie_winner',
        priority: 150,
        hooks: {
            onBrawlRoll: (ctx) => {
                const attackerFinal = ctx.attackerRoll.base + ctx.attackerRoll.bonus;
                const defenderFinal = ctx.defenderRoll.base + ctx.defenderRoll.bonus;

                if (attackerFinal === defenderFinal) {
                    ctx.attackerRoll.bonus += 1; // Artificially win the tie
                    ctx.log.push({ key: 'log.trait.brawlTieWinner', traitId: 'brawl_tie_winner', params: { name: ctx.attacker.name } });
                }
            }
        }
    }
];