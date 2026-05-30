import { env } from '@config/env';

export const loggerConfig = {
  level: env?.LOG_LEVEL,
  dir: env?.LOG_DIR,
  maxFiles: env?.LOG_MAX_FILES,
  maxSize: env?.LOG_MAX_SIZE,
  format: {
    timestamp: 'YYYY-MM-DD HH:mm:ss.SSS',
    colorize: env?.NODE_ENV === 'development',
    prettyPrint: env?.NODE_ENV === 'development',
  },
  files: {
    combined: `${env?.LOG_DIR}/combined-%DATE%.log`,
    error: `${env?.LOG_DIR}/error-%DATE%.log`,
    http: `${env?.LOG_DIR}/http-%DATE%.log`,
  },
} as const;
