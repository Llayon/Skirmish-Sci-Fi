import { handleError } from '../../utils/errorHandler';
import type { ActionMiddleware } from './types';

export const errorHandlingMiddleware: ActionMiddleware = (context, next) => {
  try {
    next();
  } catch (error) {
    handleError(error as Error, { action: context.action, battleId: context.battle.id });
    context.logEntries.push({ key: 'log.error.unexpected', params: { message: (error as Error).message } });
    context.success = false;
  }
};
