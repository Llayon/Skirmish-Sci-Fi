import { checkMissionStatus } from '../../rules/mission';
import type { ActionMiddleware } from './types';

export const missionStatusMiddleware: ActionMiddleware = (context, next) => {
  // Let the core action resolve first.
  next();

  // Then, if the action was successful and mission is still running, check for status changes.
  if (context.success && context.battle.mission.status === 'in_progress') {
    const { logs } = checkMissionStatus(context.battle, 'after_action');
    context.logEntries.push(...logs);
  }
};
