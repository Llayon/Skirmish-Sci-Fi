import { logger } from './logger';
import { uiService } from '../uiService';

/**
 * A centralized error handling function.
 * This can be used in catch blocks and error boundaries.
 * In a production environment, this would be the place to integrate
 * with an error reporting service like Sentry.
 * 
 * @param error The error object.
 * @param context An optional object providing more context about the error.
 * @param userMessage An optional user-friendly message to show in a toast.
 */
export const handleError = (error: Error, context?: Record<string, any>, userMessage?: string) => {
  // Log the error with all available information.
  logger.error(error.message, {
    error,
    stack: error.stack,
    context,
  });

  if (userMessage) {
    uiService.showError(userMessage);
  }

  // Future integration point for services like Sentry:
  // if (process.env.NODE_ENV === 'production') {
  //   Sentry.withScope(scope => {
  //     if (context) {
  //       scope.setContext("Error Context", context);
  //     }
  //     Sentry.captureException(error);
  //   });
  // }
};
