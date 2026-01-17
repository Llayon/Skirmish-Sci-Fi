import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from './uiStore';

describe('uiStore', () => {
  // Reset store to initial state before each test
  beforeEach(() => {
    useUiStore.getState().actions.reset();
  });

  it('should have correct initial state', () => {
    const state = useUiStore.getState();
    expect(state.gameMode).toBe('main_menu');
  });

  it('setGameMode should update the game mode', () => {
    useUiStore.getState().actions.setGameMode('dashboard');
    expect(useUiStore.getState().gameMode).toBe('dashboard');

    useUiStore.getState().actions.setGameMode('battle');
    expect(useUiStore.getState().gameMode).toBe('battle');
  });

  it('reset should restore the initial state', () => {
    // Change state
    useUiStore.getState().actions.setGameMode('lobby');
    expect(useUiStore.getState().gameMode).toBe('lobby');

    // Reset
    useUiStore.getState().actions.reset();
    expect(useUiStore.getState().gameMode).toBe('main_menu');
  });
});