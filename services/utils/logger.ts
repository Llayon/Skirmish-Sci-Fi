// A simple logger utility for centralized logging.
// In a real production app, this could be expanded to send logs
// to a service like Sentry, LogRocket, etc.

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// For now, we'll log everything. This could be configured via environment variables.
const CURRENT_LOG_LEVEL = LOG_LEVELS.DEBUG;

const log = (level: keyof typeof LOG_LEVELS, message: string, ...optionalParams: any[]) => {
  if (LOG_LEVELS[level] >= CURRENT_LOG_LEVEL) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;

    switch (level) {
      case 'DEBUG':
        console.debug(formattedMessage, ...optionalParams);
        break;
      case 'INFO':
        console.log(formattedMessage, ...optionalParams);
        break;
      case 'WARN':
        console.warn(formattedMessage, ...optionalParams);
        break;
      case 'ERROR':
        console.error(formattedMessage, ...optionalParams);
        break;
    }
  }
};

export const logger = {
  debug: (message: string, ...optionalParams: any[]) => log('DEBUG', message, ...optionalParams),
  info: (message: string, ...optionalParams: any[]) => log('INFO', message, ...optionalParams),
  warn: (message: string, ...optionalParams: any[]) => log('WARN', message, ...optionalParams),
  error: (message: string, ...optionalParams: any[]) => log('ERROR', message, ...optionalParams),
};
