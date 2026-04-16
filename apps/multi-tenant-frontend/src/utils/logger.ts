import loglevel from 'loglevel';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

const formatMessage = (prefix: string, message: string): string => {
  return `[${prefix}] ${message}`;
};

const isProduction = import.meta.env.PROD;

export interface Logger {
  trace: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  setLevel: (level: LogLevel) => void;
}

const createLogger = (prefix: string): Logger => {
  const logger = loglevel.getLogger(prefix);

  const wrap = (level: LogLevel, message: string, ...args: any[]) => {
    const formatted = formatMessage(prefix, message);
    switch (level) {
      case 'trace':
        logger.trace(formatted, ...args);
        break;
      case 'debug':
        logger.debug(formatted, ...args);
        break;
      case 'info':
        logger.info(formatted, ...args);
        break;
      case 'warn':
        logger.warn(formatted, ...args);
        break;
      case 'error':
        logger.error(formatted, ...args);
        break;
    }
  };

  return {
    trace: (message, ...args) => wrap('trace', message, ...args),
    debug: (message, ...args) => wrap('debug', message, ...args),
    info: (message, ...args) => wrap('info', message, ...args),
    warn: (message, ...args) => wrap('warn', message, ...args),
    error: (message, ...args) => wrap('error', message, ...args),
    setLevel: (level) => logger.setLevel(level),
  };
};

export const logger = createLogger('APP');

// API logger with fixed prefix
export const apiLogger = createLogger('API');

// Route logger for page navigation
export const routeLogger = createLogger('ROUTE');

// Component logger for React component lifecycle
export const componentLogger = createLogger('Component');

// Set default level based on environment
if (!isProduction) {
  logger.setLevel('debug');
  apiLogger.setLevel('debug');
  routeLogger.setLevel('debug');
  componentLogger.setLevel('debug');
} else {
  logger.setLevel('info');
  apiLogger.setLevel('info');
  routeLogger.setLevel('info');
  componentLogger.setLevel('warn');
}

export default logger;
