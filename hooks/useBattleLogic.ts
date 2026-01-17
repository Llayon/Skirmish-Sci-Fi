
import { useBattleInteractionState } from './battle/useBattleInteractionState';
import { useBattleDerivedData } from './battle/useBattleDerivedData';
import { useBattleActions } from './battle/useBattleActions';

/**
 * The return type of the `useBattleLogic` hook, containing all state and handlers for the battle UI.
 */
export type BattleLogic = ReturnType<typeof useBattleLogic>;

/**
 * A comprehensive custom hook that encapsulates the user interface logic for a battle.
 * It is composed of smaller, specialized hooks to manage UI state, calculate derived data, 
 * and provide memoized action handlers.
 * @returns {BattleLogic} An object containing UI state, derived data, and action handlers.
 */
export const useBattleLogic = () => {
  const interactionState = useBattleInteractionState();
  const derivedData = useBattleDerivedData(interactionState.uiState, interactionState.hoveredPos);
  const actions = useBattleActions(interactionState, derivedData);

  return {
    uiState: interactionState.uiState,
    derivedData: {
        ...derivedData,
    },
    handlers: {
      ...actions,
      setHoveredPos: interactionState.setHoveredPos,
      setRangeDisplayWeapon: interactionState.setRangeDisplayWeapon,
      cancelAction: interactionState.cancelAction,
    },
    // For convenience, hoist some commonly used properties to the top level
    characterPerformingAction: derivedData.characterPerformingAction,
    validShootTargetIds: derivedData.validShootTargetIds,
    rangeDisplayWeaponInstanceId: interactionState.rangeDisplayWeaponInstanceId,
  };
};
