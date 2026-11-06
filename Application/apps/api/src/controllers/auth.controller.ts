import type { Request, Response } from 'express';
import type {
  AcceptInviteInput,
  AuthResponse,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
} from '@ticketing/shared';
import type { BodyRequest } from '../utils/http';
import { currentUser } from '../middlewares/authenticate';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from '../utils/cookies';
import * as authService from '../services/auth.service';

const context = (req: Request): authService.SessionContext => ({ userAgent: req.get('user-agent') });

/** Sets the refresh cookie and returns the access token + user in the body. */
function sendSession(res: Response, session: authService.Session): void {
  setRefreshCookie(res, session.refreshToken, session.refreshExpiresAt);
  const body: AuthResponse = { accessToken: session.accessToken, user: session.user };
  res.json(body);
}

export async function login(req: BodyRequest<LoginInput>, res: Response) {
  sendSession(res, await authService.login(req.body, context(req)));
}

export async function refresh(req: Request, res: Response) {
  try {
    sendSession(res, await authService.refresh(readRefreshCookie(req), context(req)));
  } catch (err) {
    clearRefreshCookie(res);
    throw err;
  }
}

export async function logout(req: Request, res: Response) {
  await authService.logout(readRefreshCookie(req), currentUser(req).id);
  clearRefreshCookie(res);
  res.status(204).end();
}

export async function forgotPassword(req: BodyRequest<ForgotPasswordInput>, res: Response) {
  await authService.requestPasswordReset(req.body.email);
  res.status(202).json({ message: 'If that email belongs to an active account, a reset link has been sent.' });
}

export async function resetPassword(req: BodyRequest<ResetPasswordInput>, res: Response) {
  sendSession(res, await authService.resetPassword(req.body, context(req)));
}

export async function acceptInvite(req: BodyRequest<AcceptInviteInput>, res: Response) {
  sendSession(res, await authService.acceptInvite(req.body, context(req)));
}

export async function me(req: Request, res: Response) {
  res.json(await authService.getMe(currentUser(req).id));
}

export async function changePassword(req: BodyRequest<ChangePasswordInput>, res: Response) {
  sendSession(res, await authService.changePassword(currentUser(req).id, req.body, context(req)));
}
