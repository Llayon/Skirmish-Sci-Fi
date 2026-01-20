import { Position } from '@/types/character';

export type ParticipantId = string;
export type WeaponInstanceId = string;

export type BattleAction =
  | { type: 'move'; characterId: ParticipantId; position: Position; isDash: boolean }
  | { type: 'slide'; characterId: ParticipantId; path: Position[] }
  | { type: 'teleport'; characterId: ParticipantId; position: Position }
  | { type: 'shoot'; characterId: ParticipantId; targetId: ParticipantId; weaponInstanceId: WeaponInstanceId; isAimed: boolean }
  | { type: 'panic_fire'; characterId: ParticipantId; weaponInstanceId: WeaponInstanceId }
  | { type: 'brawl'; characterId: ParticipantId; targetId: ParticipantId; weaponInstanceId?: WeaponInstanceId }
  | { type: 'use_consumable'; characterId: ParticipantId; consumableId: string }
  | { type: 'use_utility_device'; characterId: ParticipantId; deviceId: string; targetIds?: ParticipantId[]; position?: Position }
  | { type: 'interact'; characterId: ParticipantId; targetId?: ParticipantId; position?: Position }
  | { type: 'end_turn'; characterId: ParticipantId }
  | { type: 'roll_initiative' }
  | { type: 'advance_phase' };

export type BattleActionType = BattleAction['type'];

export type BattleActionByType<T extends BattleActionType> = Extract<BattleAction, { type: T }>;
