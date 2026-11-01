import type { Request, Response } from 'express';
import type { AuthResponse } from '@ticketing/shared';
import { isProduction } from '../../config/env';
import * as authService from './auth.service';

export const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: REFRESH_COOKIE_PATH,
} as const;

const context = (req: Request): authService.SessionContext => ({ userAgent: req.get('user-agent') });

const readRefreshCookie = (req: Request): string | undefined => {
  const value: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' ? value : undefined;
};

/** Sets the refresh cookie and returns the access token + user in the body. */
function sendSession(res: Response, session: authService.Session, status = 200): void {
  res.cookie(REFRESH_COOKIE, session.refreshToken, { ...cookieOptions, expires: session.refreshExpiresAt });
  const body: AuthResponse = { accessToken: session.accessToken, user: session.user };
  res.status(status).json(body);
}

export async function login(req: Request, res: Response) {
  sendSession(res, await authService.login(req.body, context(req)));
}

export async function refresh(req: Request, res: Response) {
  try {
    sendSession(res, await authService.refresh(readRefreshCookie(req), context(req)));
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    throw err;
  }
}

export async function logout(req: Request, res: Response) {
  await authService.logout(readRefreshCookie(req), req.user!.id);
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
  res.status(204).end();
}

export async function forgotPassword(req: Request, res: Response) {
  await authService.requestPasswordReset(req.body.email);
  res.status(202).json({ message: 'If that email belongs to an active account, a reset link has been sent.' });
}

export async function resetPassword(req: Request, res: Response) {
  sendSession(res, await authService.resetPassword(req.body, context(req)));
}

export async function acceptInvite(req: Request, res: Response) {
  sendSession(res, await authService.acceptInvite(req.body, context(req)));
}

export async function me(req: Request, res: Response) {
  res.json(await authService.getMe(req.user!.id));
}

export async function changePassword(req: Request, res: Response) {
  sendSession(res, await authService.changePassword(req.user!.id, req.body, context(req)));
}
