import type { Crew } from './character';
import type { Battle, PlayerAction } from './battle';
import type { BattleAction, EngineBattleState } from '../services/engine/battle/types';
  
export type MultiplayerMessage =
  | { type: 'CREW_SHARE'; payload: Crew }
  | { type: 'START_BATTLE'; payload: Battle }
  | { type: 'PLAYER_ACTION'; payload: PlayerAction }
  | { type: 'BATTLE_UPDATE'; payload: Battle }
  | { type: 'PING' }
  | { type: 'PONG' }
  | { type: 'REQUEST_SYNC' }
  // Engine V2 Messages
  | { type: 'ENGINE_ACTION'; payload: { battleId?: string; seq: number; action: BattleAction; resultingHash: string; clientActionId?: string } }
  | { type: 'ENGINE_SNAPSHOT'; payload: { battleId?: string; seq: number; snapshot: EngineBattleState; hash: string } }
  | { type: 'ENGINE_PROPOSE_ACTION'; payload: { battleId?: string; clientActionId: string; action: BattleAction; predictedHash?: string } }
  | { type: 'ENGINE_ACTION_REJECT'; payload: { battleId?: string; clientActionId: string; reason: 'invalid_action' | 'battle_id_mismatch' | 'resyncing' } };
