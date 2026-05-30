import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';

export const notFound = (_req: Request, res: Response, _next: NextFunction): void => {
  const code = StatusCodes.NOT_FOUND;
  res.status(code).json({
    code,
    message: `Route ${_req.method} ${_req.originalUrl} not found.`,
    data: null,
  });
};
