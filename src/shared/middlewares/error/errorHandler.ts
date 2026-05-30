import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '@shared/errors/AppError';
import { logger } from '@infra/monitoring/logger';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    logger.warn(`[AppError] ${err.statusCode} — ${err.message}`);
    res.status(err.statusCode).json({
      code: err.statusCode,
      message: err.message,
      data: null,
    });
    return;
  }
  logger.error('[UnhandledError]', { message: err.message, stack: err.stack });
  const code = StatusCodes.INTERNAL_SERVER_ERROR;
  res.status(code).json({
    code,
    message: 'An unexpected error occurred. Please try again later.',
    data: null,
  });
};
