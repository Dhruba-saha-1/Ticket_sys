import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Request whose body has already been parsed by validate({ body }). */
export type BodyRequest<TBody> = Request<Record<string, string>, unknown, TBody>;

// Express 4 does not forward rejected promises to the error handler.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
