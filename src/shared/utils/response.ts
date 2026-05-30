import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = StatusCodes.OK,
  meta?: Record<string, unknown>,
): Response => {
  const payload: ApiResponse<T> = { success: true, message, data };
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
};

export const sendCreated = <T>(
  res: Response,
  data: T,
  message = 'Created successfully',
): Response => sendSuccess(res, data, message, StatusCodes.CREATED);

export const sendError = (
  res: Response,
  error: string,
  statusCode = StatusCodes.INTERNAL_SERVER_ERROR,
): Response => {
  const payload: ApiResponse = { success: false, error };
  return res.status(statusCode).json(payload);
};

export const sendNoContent = (res: Response): Response =>
  res.status(StatusCodes.NO_CONTENT).send();
