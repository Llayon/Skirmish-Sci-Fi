import { useEffect } from 'react';
import type { BattleLogic } from '@/hooks/useBattleLogic';
import { useBattleStore, useHudStore, useMultiplayerStore } from '@/stores';
import { useShallow } from 'zustand/react/shallow';

type UseBattleHotkeysOptions = {
  battleLogic: BattleLogic;
  is3D: boolean;
  toggleHudModal: () => void;
};

export const useBattleHotkeys = ({ battleLogic, is3D, toggleHudModal }: UseBattleHotkeysOptions) => {
  const multiplayerRole = useMultiplayerStore((s) => s.multiplayerRole);
  const togglePanel = useHudStore((s) => s.actions.togglePanel);

  const {
    battle,
    selectedParticipantId,
    activeParticipantId,
    setSelectedParticipantId,
    requestCameraFocusOn,
    requestCameraReset,
  } = useBattleStore(
    useShallow((s) => ({
      battle: s.battle,
      selectedParticipantId: s.selectedParticipantId,
      activeParticipantId: s.battle?.activeParticipantId ?? null,
      setSelectedParticipantId: s.actions.setSelectedParticipantId,
      requestCameraFocusOn: s.actions.requestCameraFocusOn,
      requestCameraReset: s.actions.requestCameraReset,
    }))
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const key = event.key.toLowerCase();
      if (document.querySelector('[role="dialog"][aria-modal="true"]') && key !== 'h') return;

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || target?.isContentEditable) return;

      if (key === 'h') {
        toggleHudModal();
        return;
      }
      if (key === 'l') {
        togglePanel('log');
        return;
      }
      if (key === 'm') {
        togglePanel('mission');
        return;
      }
      if (key === 'q') {
        togglePanel('queue');
        return;
      }
      if (key === 'escape') {
        battleLogic.handlers.cancelAction();
        return;
      }
      if (key === 'tab') {
        if (!battle) return;
        event.preventDefault();

        const alive = battle.participants.filter((p: any) => p.status !== 'casualty' && p.status !== 'bailing');
        const preferred =
          multiplayerRole != null
            ? alive.filter((p) => p.id.startsWith(multiplayerRole))
            : alive.filter((p) => p.type === 'character');
        const list = preferred.length > 0 ? preferred : alive;
        if (list.length === 0) return;

        const currentId = selectedParticipantId ?? activeParticipantId;
        const currentIndex = currentId ? list.findIndex((p) => p.id === currentId) : -1;
        const direction = event.shiftKey ? -1 : 1;
        const nextIndex =
          currentIndex === -1
            ? direction === 1
              ? 0
              : list.length - 1
            : (currentIndex + direction + list.length) % list.length;
        setSelectedParticipantId(list[nextIndex].id);
        return;
      }

      if (!is3D || !battle) return;

      if (key === 'r') {
        requestCameraReset();
        return;
      }
      if (key === 'f') {
        const selected = selectedParticipantId ? battle.participants.find((p) => p.id === selectedParticipantId) : null;
        const active = activeParticipantId ? battle.participants.find((p) => p.id === activeParticipantId) : null;
        const targetP = selected ?? active;
        if (!targetP) return;
        requestCameraFocusOn(targetP.position);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeParticipantId,
    battle,
    battleLogic.handlers,
    is3D,
    multiplayerRole,
    requestCameraFocusOn,
    requestCameraReset,
    selectedParticipantId,
    setSelectedParticipantId,
    toggleHudModal,
    togglePanel,
  ]);
};
