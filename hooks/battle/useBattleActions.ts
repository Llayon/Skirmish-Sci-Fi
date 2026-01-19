
import { useCallback } from 'react';
import { shallow } from 'zustand/shallow';
import { useBattleStore } from '@/stores';
import { PlayerAction, Position, AnimationState, Character, PlayerActionUIState } from '@/types';
import { findPath, distance, getLinePath } from '@/services/gridUtils';
import { isOpponent as isParticipantOpponent } from '@/services/participantUtils';
import { useBattleDerivedData } from './useBattleDerivedData';
import { useBattleInteractionState } from './useBattleInteractionState';
import { rollD6 } from '@/services/utils/rolls';
import { BattleDomain } from '@/services/domain/battleDomain';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type InteractionState = ReturnType<typeof useBattleInteractionState>;
type DerivedData = ReturnType<typeof useBattleDerivedData>;

/**
 * Provides memoized action handlers for player interactions in the battle.
 * These handlers dispatch actions to the global battle store.
 */
export const useBattleActions = (
  interactionState: InteractionState,
  derivedData: DerivedData
) => {
  const { setUiState, cancelAction } = interactionState;
  const { characterPerformingAction, reachableCells } = derivedData;
  
  const battle = useBattleStore(state => state.battle!);
  const { dispatchAction, endTurn: endTurnAction, setAnimation, setAnimatingParticipantId, clearAnimation, setBattle } = useBattleStore(state => state.actions);


  const handleGridClick = useCallback(async (pos: Position) => {
    if (interactionState.uiState.mode === 'idle' || !characterPerformingAction) return;

    let action: PlayerAction | null = null;
    let animation: AnimationState = null;
    let duration = 0;
    const actorId = characterPerformingAction.id;

    switch (interactionState.uiState.mode) {
      case 'move':
      case 'follow_up_move':
        if (reachableCells?.has(`${pos.x},${pos.y}`)) {
          action = { type: interactionState.uiState.mode, payload: { characterId: actorId, position: pos, isDash: 'isDash' in interactionState.uiState ? interactionState.uiState.isDash : false } };
          const path = findPath(characterPerformingAction.position, pos, battle, actorId, true);
          if (path) {
            animation = { type: 'move', path, id: `anim_${Date.now()}` };
            duration = 1000;
          }
        }
        break;
      case 'sliding': {
        if (reachableCells?.has(`${pos.x},${pos.y}`)) {
          const path = getLinePath(characterPerformingAction.position, pos);
          action = { type: 'slide', payload: { characterId: actorId, path } };
          animation = { type: 'move', path, id: `anim_${Date.now()}` };
          duration = 1000;
        }
        break;
      }
      case 'teleporting':
        if (reachableCells?.has(`${pos.x},${pos.y}`)) {
            action = { type: 'teleport', payload: { characterId: actorId, position: pos }};
        }
        break;
      case 'shoot': {
        const target = battle.participants.find(p => p.position.x === pos.x && p.position.y === pos.y && isParticipantOpponent(characterPerformingAction, p, null));
        if (target && interactionState.uiState.weaponInstanceId) {
          action = { type: 'shoot', payload: { characterId: actorId, targetId: target.id, weaponInstanceId: interactionState.uiState.weaponInstanceId, isAimed: interactionState.uiState.isAimed } };
          animation = { type: 'shoot', from: characterPerformingAction.position, to: target.position, id: `anim_${Date.now()}` };
          duration = 400;
        }
        break;
      }
      case 'brawling': {
        const target = battle.participants.find(p => p.position.x === pos.x && p.position.y === pos.y && isParticipantOpponent(characterPerformingAction, p, null));
        if (target && distance(characterPerformingAction.position, target.position) <= 1) {
          action = { type: 'brawl', payload: { characterId: actorId, targetId: target.id, weaponInstanceId: interactionState.uiState.weaponInstanceId } };
        }
        break;
      }
    }

    if (action) {
      cancelAction();

      if (animation) {
        try {
          setAnimatingParticipantId(actorId);
          setAnimation(animation);
          await sleep(duration);
          dispatchAction(action);
        } finally {
          clearAnimation();
        }
        await sleep(500);
      } else {
        dispatchAction(action);
      }
    }
  }, [interactionState.uiState, characterPerformingAction, reachableCells, battle, cancelAction, setAnimatingParticipantId, setAnimation, clearAnimation, dispatchAction]);

  const selectMoveAction = useCallback((characterId: string, isDash: boolean) => {
    setUiState({ mode: 'move', characterId, isDash });
  }, [setUiState]);

  const selectShootAction = useCallback((characterId: string, isAimed: boolean) => {
    const participant = battle.participants.find(p => p.id === characterId);
    if (!participant) return;

    const availableWeapons = (participant.weapons || [])
      .map(cw => BattleDomain.getEffectiveWeapon(participant, cw.instanceId))
      .filter(w => !!w && w.range !== 'brawl');

    if (availableWeapons.length === 1) {
      setUiState({ mode: 'shoot', characterId, isAimed, weaponInstanceId: availableWeapons[0]!.instanceId! });
    } else {
      setUiState({ mode: 'selectingShootWeapon', characterId, isAimed });
    }
  }, [battle.participants, setUiState]);

  const selectPanicFireAction = useCallback((characterId: string) => {
    setUiState({ mode: 'selectingPanicFireWeapon', characterId });
  }, [setUiState]);
  
  const selectWeaponForAction = useCallback((weaponInstanceId: string) => {
    if (interactionState.uiState.mode === 'selectingShootWeapon') {
      setUiState({
        mode: 'shoot',
        characterId: interactionState.uiState.characterId,
        isAimed: interactionState.uiState.isAimed,
        weaponInstanceId,
      });
    } else if (interactionState.uiState.mode === 'selectingPanicFireWeapon') {
      dispatchAction({ type: 'panic_fire', payload: { characterId: interactionState.uiState.characterId, weaponInstanceId } });
      cancelAction();
    }
  }, [interactionState.uiState, dispatchAction, cancelAction, setUiState]);

  const selectBrawlAction = useCallback((characterId: string) => {
    setUiState({ mode: 'selectingBrawlWeapon', characterId });
  }, [setUiState]);

  const selectBrawlWeapon = useCallback((weaponInstanceId?: string) => {
    if (interactionState.uiState.mode === 'selectingBrawlWeapon') {
      setUiState({ mode: 'brawling', characterId: interactionState.uiState.characterId, weaponInstanceId });
    }
  }, [interactionState.uiState, setUiState]);

  const selectInteractAction = useCallback((characterId: string) => {
    dispatchAction({ type: 'interact', payload: { characterId } });
  }, [dispatchAction]);

  const selectTeleportAction = useCallback((characterId: string) => {
    const character = battle.participants.find(p => p.id === characterId);
    if (character) {
      const upgradeLevel = (character as Character).specialAbilityUpgrades?.stalker_teleport || 0;
      const teleportDistance = rollD6() + upgradeLevel;
      setUiState({ mode: 'teleporting', characterId, distance: teleportDistance });
    }
  }, [battle.participants, setUiState]);

  const selectSlideAction = useCallback((characterId: string) => {
    const character = battle.participants.find(p => p.id === characterId);
    if (character) {
      const slideDistance = rollD6();
      setUiState({ mode: 'sliding', characterId, distance: slideDistance });
    }
  }, [battle.participants, setUiState]);

  const selectFollowUpMove = useCallback((characterId: string) => {
    setUiState({ mode: 'follow_up_move', characterId });
  }, [setUiState]);

  const skipFollowUpMove = useCallback(() => {
    setBattle(b => { b.followUpState = null; });
    cancelAction();
  }, [setBattle, cancelAction]);

  const handleUseConsumable = useCallback((characterId: string, consumableId: string) => {
    const action: PlayerAction = { type: 'use_consumable', payload: { characterId, consumableId } };
    dispatchAction(action);
    cancelAction();
  }, [dispatchAction, cancelAction]);
  
  const selectConsumableAction = useCallback((characterId: string) => {
    setUiState({ mode: 'selectingConsumable', characterId });
  }, [setUiState]);

  const endTurn = useCallback(() => {
    const activeParticipant = battle.participants.find(p => p.id === battle.activeParticipantId);
    if (activeParticipant) {
        endTurnAction(activeParticipant.id);
    }
    cancelAction();
  }, [battle, endTurnAction, cancelAction]);

  return {
    handleGridClick,
    selectMoveAction,
    selectShootAction,
    selectPanicFireAction,
    selectWeaponForAction,
    selectBrawlAction,
    selectBrawlWeapon,
    selectInteractAction,
    selectTeleportAction,
    selectSlideAction,
    selectFollowUpMove,
    skipFollowUpMove,
    handleUseConsumable,
    selectConsumableAction,
    endTurn,
  };
};
