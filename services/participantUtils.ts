import { BattleParticipant, MultiplayerRole } from '../types';

/**
 * Determines if 'other' is an opponent of 'participant'.
 */
export const isOpponent = (
  participant: BattleParticipant,
  other: BattleParticipant,
  multiplayerRole: MultiplayerRole | null
): boolean => {
  if (multiplayerRole) {
    const participantRole = participant.id.startsWith('host') ? 'host' : 'guest';
    const otherRole = other.id.startsWith('host') ? 'host' : 'guest';
    return participantRole !== otherRole;
  }
  return participant.type !== other.type;
};
