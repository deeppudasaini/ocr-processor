import { Request, Response, NextFunction, RequestHandler } from 'express';

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .then((result) => {
        if (!res.headersSent && result !== undefined) {
          res.locals.data = result;
          next();
        }
      })
      .catch(next);
  };
