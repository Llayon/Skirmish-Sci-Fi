import type { ActionMiddleware } from './types';
import { Battle, BattleParticipant, PlayerAction } from '../../../types';
import { distance } from '../../gridUtils';

// Logic moved from services/validation.ts
const validatePlayerAction = (action: PlayerAction, battle: Battle, participant: BattleParticipant): { isValid: boolean; reason: string } => {
    // A casualty or dazed character can have their turn ended by the system, but can't perform other actions.
    if ((participant.status === 'casualty' || participant.status === 'dazed') && action.type !== 'end_turn') {
        return { isValid: false, reason: `Participant ${participant.name} is ${participant.status} and cannot act.` };
    }

    const hasStillEffect = participant.activeEffects.some(e => e.sourceId === 'still');
    const hasPreventMoveEffect = participant.activeEffects.some(e => e.preventMovement);

    switch (action.type) {
        case 'move': {
            if (participant.actionsRemaining < 1) return { isValid: false, reason: 'No actions remaining.' };
            if (participant.actionsTaken.move) return { isValid: false, reason: 'Already moved this turn.' };
            if (hasStillEffect) return { isValid: false, reason: 'Cannot move while in Still stance.'};
            if (hasPreventMoveEffect) return { isValid: false, reason: 'Cannot move due to an effect.'};
            if (action.payload.isDash && (participant.actionsTaken.combat || participant.actionsTaken.interact)) return { isValid: false, reason: 'Cannot dash after a combat or interact action.' };
            
            return { isValid: true, reason: '' };
        }

        case 'teleport': {
            if (participant.actionsRemaining < 1) return { isValid: false, reason: 'No actions remaining.' };
            if (participant.actionsTaken.move) return { isValid: false, reason: 'Already moved this turn.' };
            if (hasStillEffect) return { isValid: false, reason: 'Cannot move while in Still stance.' };
            if (hasPreventMoveEffect) return { isValid: false, reason: 'Cannot move due to an effect.' };
            return { isValid: true, reason: '' };
        }
        
        case 'shoot': {
            const actionCost = action.payload.isAimed ? 2 : 1;
            if (participant.actionsRemaining < actionCost) return { isValid: false, reason: `Not enough actions remaining (${participant.actionsRemaining}/${actionCost}).` };
            if (participant.status === 'stunned' && action.payload.isAimed) {
                return { isValid: false, reason: 'Stunned characters cannot take 2-action Aimed Shots.' };
            }
            if (participant.actionsTaken.combat || participant.actionsTaken.interact) return { isValid: false, reason: 'Already performed a combat or interact action.' };
            if (action.payload.isAimed && participant.actionsTaken.move) return { isValid: false, reason: 'Cannot aim after moving.' };
            if (participant.actionsTaken.dash) return { isValid: false, reason: 'Cannot shoot after dashing.' };
            
            return { isValid: true, reason: '' };
        }
        
        case 'brawl': {
            if (participant.actionsRemaining < 1) return { isValid: false, reason: 'No actions remaining.' };
            if (participant.actionsTaken.combat || participant.actionsTaken.interact) return { isValid: false, reason: 'Already performed a combat or interact action.' };
            if (participant.actionsTaken.dash) return { isValid: false, reason: 'Cannot brawl after dashing.' };
            const target = battle.participants.find(p => p.id === action.payload.targetId);
            if (!target) return { isValid: false, reason: 'Target not found.' };
            if (distance(participant.position, target.position) > 1) return { isValid: false, reason: 'Target is not adjacent.' };
            
            return { isValid: true, reason: '' };
        }

        case 'interact': {
            if (participant.actionsRemaining < 1) return { isValid: false, reason: 'No actions remaining.' };
            if (participant.actionsTaken.combat || participant.actionsTaken.interact) return { isValid: false, reason: 'Already performed a combat or interact action.' };
            if (participant.actionsTaken.dash) return { isValid: false, reason: 'Cannot interact after dashing.' };

            return { isValid: true, reason: ''};
        }

        case 'use_consumable': {
            const alreadyUsedOne = (participant.consumablesUsedThisTurn || 0) > 0;
            if (alreadyUsedOne) {
                if (participant.actionsRemaining < 1) return { isValid: false, reason: 'No actions remaining for second consumable.' };
                if (participant.actionsTaken.combat || participant.actionsTaken.interact) return { isValid: false, reason: 'Already performed a combat or interact action.'};
            }
            return { isValid: true, reason: '' };
        }

        default:
            // Actions without strict validation requirements (like end_turn, follow_up_move) pass through.
            return { isValid: true, reason: '' };
    }
};

export const validationMiddleware: ActionMiddleware = (context, next) => {
  const { battle, action, logEntries } = context;
  const participantId = 'characterId' in action.payload ? action.payload.characterId : null;
  if (participantId) {
    const participant = battle.participants.find(p => p.id === participantId);
    if (participant) {
      const { isValid, reason } = validatePlayerAction(action, battle, participant);
      if (!isValid) {
        console.warn(`Invalid action blocked: ${action.type}. Reason: ${reason}`);
        logEntries.push({ key: 'log.error.invalidAction', params: { reason } });
        context.success = false;
        return;
      }
    }
  }
  next();
};
