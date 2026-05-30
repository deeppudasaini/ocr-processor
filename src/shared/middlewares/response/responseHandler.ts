import { Request, Response, NextFunction } from 'express';

export const responseHandler = (_req: Request, res: Response, next: NextFunction): void => {
  if (res.headersSent) {
    return next();
  }

  if (res.locals.data !== undefined) {
    const payload = res.locals.data;
    
    // Check if the payload already matches our standard format, or if it's just raw data
    // We allow controllers to return { data: any, message: string, code?: number }
    const isStandardized = payload && typeof payload === 'object' && ('data' in payload || 'message' in payload);
    
    const code = isStandardized && payload.code ? payload.code : (res.statusCode >= 400 ? 200 : res.statusCode || 200);
    const message = isStandardized && payload.message ? payload.message : 'Success';
    const data = isStandardized && payload.data !== undefined ? payload.data : (!isStandardized ? payload : null);

    res.status(code).json({
      code,
      message,
      data,
    });
    return;
  }

  next();
};
