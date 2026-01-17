import type { Crew } from './character';
import type { Battle, PlayerAction } from './battle';
  
export type MultiplayerMessage =
  | { type: 'CREW_SHARE'; payload: Crew }
  | { type: 'START_BATTLE'; payload: Battle }
  | { type: 'PLAYER_ACTION'; payload: PlayerAction }
  | { type: 'BATTLE_UPDATE'; payload: Battle }
  | { type: 'PING' }
  | { type: 'PONG' }
  | { type: 'REQUEST_SYNC' };
