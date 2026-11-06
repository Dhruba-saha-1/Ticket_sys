import type { Request, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

let enabled = env.RATE_LIMIT_ENABLED;

/** Test hook. */
export function setRateLimitEnabled(value: boolean): void {
  enabled = value;
}

const isWrite = (req: Request) => !['GET', 'HEAD', 'OPTIONS'].includes(req.method);

const rejectHandler: RequestHandler = (_req, res) => {
  res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests, try again later' } });
};

const common = { standardHeaders: 'draft-7', legacyHeaders: false, handler: rejectHandler } as const;

/** Credential endpoints: 10 requests / 15 min / IP. */
export const authLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skip: () => !enabled,
});

const userKey = (req: Request) => req.user?.id ?? req.ip ?? 'unknown';

const userWriteLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: 120,
  keyGenerator: userKey,
  skip: (req) => !enabled || !isWrite(req),
});

const userReadLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: 300,
  keyGenerator: userKey,
  skip: (req) => !enabled || isWrite(req),
});

/** Per-user limits (120 writes / 300 reads per minute). Mount after authenticate. */
export const userLimiters = [userWriteLimiter, userReadLimiter];
