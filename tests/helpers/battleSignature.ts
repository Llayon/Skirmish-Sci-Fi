
import type { Battle, BattleParticipant } from '@/types/battle';
import type { ActiveEffect } from '@/types/character';

export interface ParticipantSignature {
  id: string;
  type: 'character' | 'enemy';
  pos: string;
  status: string;
  stun: number;
  actions: number;
  taken: string;
  effects: string[];
  luck: number;
  armor?: string;
  weapons: string[];
}

export type MissionSignature = Partial<{
  type: string;
  status: string;
  targetEnemyId: string;
  itemCarrierId: string | null;
  itemPosition: string | null;
  itemDestroyed: boolean;
  packageDelivered: boolean;
  crewMembersExited: number;
  vipId: string;
  vipTurnStartInZone: boolean;
  secureRoundsCompleted: number;
  eliminateTargetCanEscape: boolean;
}>;

export interface BattleSignature {
  round: number;
  phase: string;
  activeId: string | null;
  participants: ParticipantSignature[];
  mission: MissionSignature;
  log: string[];
  reactionRolls: string[];
}

const formatPosition = (p: { x: number; y: number }) => `${p.x},${p.y}`;

const formatEffects = (effects: ActiveEffect[]): string[] => {
  return [...effects]
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId))
    // Removed sourceName to avoid brittleness on text changes
    .map(e => `${e.sourceId}:${e.duration}`);
};

const formatActionsTaken = (p: BattleParticipant): string => {
  const { move, combat, dash, interact } = p.actionsTaken;
  return `m:${move ? 1 : 0},c:${combat ? 1 : 0},d:${dash ? 1 : 0},i:${interact ? 1 : 0}`;
};

const getParticipantSignature = (p: BattleParticipant): ParticipantSignature => ({
  id: p.id,
  type: p.type,
  pos: formatPosition(p.position),
  status: p.status,
  stun: p.stunTokens ?? 0,
  actions: p.actionsRemaining ?? 0,
  taken: formatActionsTaken(p),
  effects: formatEffects(p.activeEffects ?? []),
  luck: p.currentLuck ?? 0,
  armor: p.armor ?? undefined,
  weapons: p.weapons?.map(w => w.weaponId) ?? [],
});

export function createBattleSignature(battle: Battle): BattleSignature {
  // Sort participants by ID to ensure stable order
  const participants = [...battle.participants]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(getParticipantSignature);

  // Take last 10 log entries, ignoring params
  const logTail = (battle.log ?? [])
    .slice(-10)
    .map(entry => (typeof entry === 'string' ? entry : entry.key));

  // Sort reaction rolls by key
  const reactionRolls = Object.entries(battle.reactionRolls ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${key}:${val.roll}:${val.success}`);

  const m = battle.mission;
  
  // Only include basic fields + whitelisted existing fields
  const mission: MissionSignature = m ? { type: m.type, status: m.status } : {};

  if (m) {
    const MISSION_FIELDS = [
      'targetEnemyId',
      'itemCarrierId',
      'itemPosition',
      'itemDestroyed',
      'packageDelivered',
      'crewMembersExited',
      'vipId',
      'vipTurnStartInZone',
      'secureRoundsCompleted',
      'eliminateTargetCanEscape',
    ] as const;

    for (const field of MISSION_FIELDS) {
      if (field in m && m[field] !== undefined) {
        const value = m[field];
        mission[field] = field === 'itemPosition' && value
          ? formatPosition(value as { x: number; y: number })
          : value as any;
      }
    }
  }

  return {
    round: battle.round,
    phase: battle.phase,
    activeId: battle.activeParticipantId,
    participants,
    mission,
    log: logTail,
    reactionRolls,
  };
}
