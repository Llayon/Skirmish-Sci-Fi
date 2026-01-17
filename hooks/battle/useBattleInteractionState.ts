import { useState, useCallback } from 'react';
import { Position, PlayerActionUIState } from '@/types';

/**
 * Manages local UI state for battle interactions, such as the current action mode,
 * hovered cell, and weapon range display.
 */
export const useBattleInteractionState = () => {
  const [uiState, setUiState] = useState<PlayerActionUIState>({ mode: 'idle' });
  const [hoveredPos, setHoveredPos] = useState<Position | null>(null);
  const [rangeDisplayWeaponInstanceId, setRangeDisplayWeaponInstanceId] = useState<string | null>(null);

  const cancelAction = useCallback(() => {
    setUiState({ mode: 'idle' });
  }, []);

  const setRangeDisplayWeapon = useCallback((instanceId: string | null) => {
    setRangeDisplayWeaponInstanceId(prev => (prev === instanceId ? null : instanceId));
  }, []);

  return {
    uiState,
    setUiState,
    hoveredPos,
    setHoveredPos,
    rangeDisplayWeaponInstanceId,
    setRangeDisplayWeapon,
    cancelAction,
  };
};
