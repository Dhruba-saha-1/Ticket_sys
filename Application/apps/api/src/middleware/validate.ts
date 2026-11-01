import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../lib/AppError';

interface RequestSchemas {
  params?: ZodTypeAny;
  query?: ZodTypeAny;
  body?: ZodTypeAny;
}

/** Validates and replaces req.params / req.query / req.body with the parsed values. */
export const validate =
  (schemas: RequestSchemas): RequestHandler =>
  (req, _res, next) => {
    for (const key of ['params', 'query', 'body'] as const) {
      const schema = schemas[key];
      if (!schema) continue;

      const result = schema.safeParse(req[key]);
      if (!result.success) {
        return next(new AppError('VALIDATION_ERROR', 'Invalid request', result.error.flatten()));
      }
      (req as unknown as Record<string, unknown>)[key] = result.data;
    }
    next();
  };
