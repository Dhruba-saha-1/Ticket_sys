import type { Request, Response } from 'express';
import { isProduction } from '../config/env';

const REFRESH_COOKIE = 'refresh_token';

// Scoped to the auth routes so the refresh token is never sent anywhere else.
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/api/v1/auth',
} as const;

export function readRefreshCookie(req: Request): string | undefined {
  const value: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' ? value : undefined;
}

export function setRefreshCookie(res: Response, token: string, expires: Date): void {
  res.cookie(REFRESH_COOKIE, token, { ...cookieOptions, expires });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
}
