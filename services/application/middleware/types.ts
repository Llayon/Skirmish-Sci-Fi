import { Battle, PlayerAction, MultiplayerRole, LogEntry } from '../../../types';

export interface MiddlewareContext {
  battle: Battle;
  action: PlayerAction;
  multiplayerRole: MultiplayerRole | null;
  logEntries: LogEntry[];
  success: boolean;
}

export type ActionMiddleware = (context: MiddlewareContext, next: () => void) => void;
