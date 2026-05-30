import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { loggerConfig } from '@config/logger';
import { env } from '@config/env';
import * as process from 'process';

const logDir = path.resolve(process.cwd(), loggerConfig.dir);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level}]: ${stack ?? message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: loggerConfig.level,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: loggerConfig.format.timestamp }),
    logFormat,
  ),
  transports: [
    // Console (colored in development)
    new winston.transports.Console({
      format: loggerConfig.format.colorize
        ? combine(colorize({ all: true }), errors({ stack: true }), timestamp({ format: loggerConfig.format.timestamp }), logFormat)
        : undefined,
      silent: env?.NODE_ENV === 'test',
    }),
    // Combined log file
    new winston.transports.File({
      filename: loggerConfig.files.combined,
      maxFiles: loggerConfig.maxFiles as any,
      maxsize: Number((loggerConfig.maxSize as string).replace('m', '')) * 1024 * 1024,
    }),
    // Error-only log file
    new winston.transports.File({
      level: 'error',
      filename: loggerConfig.files.error,
      maxFiles: loggerConfig.maxFiles as any,
      maxsize: Number((loggerConfig.maxSize as string).replace('m', '')) * 1024 * 1024,
    }),
  ],
});

export const httpLogStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};
