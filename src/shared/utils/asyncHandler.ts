import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async Express handler so that any rejected promise is forwarded
 * to next() (and thus to the global error handler) automatically.
 * It also captures the returned value and passes it to the response handler.
 */
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
