import { produce } from 'immer';
import { EngineBattleState, BattleAction, BattleEvent, EngineLogEntry } from '../types';
import { getConsumableById } from '@/services/data/items';
import { distance } from '@/services/gridUtils';

export const useConsumable = (
    state: EngineBattleState,
    action: Extract<BattleAction, { type: 'USE_CONSUMABLE' }>
): { next: EngineBattleState; events: BattleEvent[]; log: EngineLogEntry[] } => {
    const events: BattleEvent[] = [];
    const log: EngineLogEntry[] = [];

    const next = produce(state, draft => {
        const { participantId, consumableId } = action;
        const user = draft.battle.participants.find(p => p.id === participantId);

        if (!user || user.type !== 'character') return;

        const consumable = getConsumableById(consumableId);
        if (!consumable) return;

        const consumableIndex = user.consumables.indexOf(consumableId);
        if (consumableIndex === -1) return;

        // Remove consumable
        user.consumables.splice(consumableIndex, 1);
        
        // Base log
        log.push({ key: 'log.playerPhase.usesConsumable', params: { name: user.name, consumable: consumableId } });
        
        // Base Event
        events.push({ type: 'CONSUMABLE_USED', participantId: user.id, consumableId: consumable.id });

        // Apply effects
        switch(consumable.id) {
            case 'booster_pills':
                user.status = 'active';
                user.stunTokens = 0;
                user.activeEffects.push({ sourceId: 'booster_pills', sourceName: 'Booster Pills', duration: 1, statModifiers: { speed: user.stats.speed } });
                log.push({ key: 'log.playerPhase.boosterPillsEffect' });
                break;
            case 'combat_serum':
                user.activeEffects.push({ sourceId: 'combat_serum', sourceName: 'Combat Serum', duration: -1, statModifiers: { reactions: 2, speed: 2 } });
                log.push({ key: 'log.playerPhase.combatSerumEffect' });
                break;
            case 'rage_out':
                user.activeEffects.push({ sourceId: 'rage_out', sourceName: 'Rage Out', duration: user.raceId === 'kerin' ? -1 : 2, statModifiers: { speed: 2 } });
                log.push({ key: 'log.playerPhase.rageOutEffect' });
                break;
            case 'still':
                user.activeEffects.push({ sourceId: 'still', sourceName: 'Still Stance', duration: 2, preventMovement: true });
                log.push({ key: 'log.playerPhase.stillEffect' });
                break;
            case 'kiranin_crystals':
                // Logic: Affects opponents within 4 spaces who haven't acted fully (actionsRemaining === 2)
                const userRole = user.id.split('-')[0]; // 'host' or 'guest' (simplified)
                
                const targets = draft.battle.participants.filter(p => {
                    if (p.id === user.id) return false;
                    const pRole = p.id.split('-')[0];
                    const isOpponent = pRole !== userRole; 
                    
                    return isOpponent && p.status === 'active' && p.actionsRemaining === 2 && distance(user.position, p.position) <= 4;
                });

                if (targets.length > 0) {
                    targets.forEach(t => {
                        t.status = 'dazed';
                        log.push({ key: 'log.playerPhase.kiraninCrystalsDazed', params: { target: t.name } });
                        events.push({ type: 'CONSUMABLE_USED', participantId: user.id, consumableId: consumable.id, targetId: t.id });
                    });
                } else {
                    log.push({ key: 'log.playerPhase.kiraninCrystalsNoEffect' });
                }
                break;
             case 'stim_pack':
                user.status = 'active';
                user.stunTokens = 0;
                break;
             case 'med_patch':
                 // No-op for now as per V1 logic review
                 break;
        }

        // Action Cost Logic
        if (!user.consumablesUsedThisTurn) user.consumablesUsedThisTurn = 0;
        user.consumablesUsedThisTurn++;

        if (user.consumablesUsedThisTurn > 1) {
            user.actionsRemaining--;
            user.actionsTaken.combat = true;
            log.push({ key: 'log.playerPhase.consumableCostAction' });

            if (user.actionsRemaining <= 0) {
                user.actionsTaken = { move: true, combat: true, dash: true, interact: true };
            }
        } else {
            log.push({ key: 'log.playerPhase.consumableCostFree' });
        }
    });

    return { next, events, log };
};
