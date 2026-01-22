import { useEffect } from 'react';
import { useBattleStore } from '@/stores/battleStore';
import {
  selectCurrentEvent,
  selectHasPendingEvents,
  selectEngineV2Enabled,
} from '@/stores/battleStore.selectors';

export const useBattleEventConsumer = () => {
  const engineV2Enabled = useBattleStore(selectEngineV2Enabled);
  const hasPendingEvents = useBattleStore(selectHasPendingEvents);
  const currentEvent = useBattleStore(selectCurrentEvent);
  const eventCursor = useBattleStore((s) => s.eventCursor);
  const lastEngineStateHash = useBattleStore((s) => s.lastEngineStateHash);

  const advanceEventCursor = useBattleStore((state) => state.actions.advanceEventCursor);
  const setShowEnemyTurnBanner = useBattleStore((state) => state.actions.setShowEnemyTurnBanner);
  const setSelectedParticipantId = useBattleStore((state) => state.actions.setSelectedParticipantId);
  const setAnimation = useBattleStore((state) => state.actions.setAnimation);
  const setAnimatingParticipantId = useBattleStore((state) => state.actions.setAnimatingParticipantId);

  useEffect(() => {
    if (!engineV2Enabled || !hasPendingEvents || !currentEvent) return;

    if (import.meta.env.DEV && !import.meta.env.VITEST) {
      console.debug('[EngineEvent]', currentEvent);
    }

    // Process event
    switch (currentEvent.type) {
      case 'PHASE_CHANGED':
        setShowEnemyTurnBanner(currentEvent.to === 'enemy_actions');
        break;
      case 'ACTIVE_PARTICIPANT_SET':
        if (currentEvent.participantId !== null) {
          setSelectedParticipantId(currentEvent.participantId);
        }
        break;
      case 'PARTICIPANT_MOVED': {
        const hashPart = lastEngineStateHash ?? 'nohash';
        setAnimatingParticipantId(currentEvent.participantId);
        setAnimation({
          id: `move-${currentEvent.participantId}-${eventCursor}-${hashPart}`,
          type: 'move',
          path: [currentEvent.from, currentEvent.to],
        });
        break;
      }
      // Other events are no-op for now (Stage 3C)
    }

    // Always advance cursor after processing
    advanceEventCursor(1);
  }, [
    engineV2Enabled,
    hasPendingEvents,
    currentEvent,
    eventCursor,
    lastEngineStateHash,
    advanceEventCursor,
    setShowEnemyTurnBanner,
    setSelectedParticipantId,
    setAnimation,
    setAnimatingParticipantId,
  ]);
};
