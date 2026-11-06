import type { Request } from 'express';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/http';
import { verifyAccessToken } from '../utils/tokens';
import * as userService from '../services/user.service';

/** Verifies the bearer access token and loads an active user into req.user. */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('UNAUTHENTICATED', 'Missing access token');
  }

  const payload = verifyAccessToken(header.slice('Bearer '.length));
  const user = await userService.findActiveById(payload.sub);
  if (!user) {
    throw new AppError('UNAUTHENTICATED', 'User is not active');
  }

  req.user = { id: user.id, email: user.email, name: user.name, isSuperAdmin: user.isSuperAdmin };
  next();
});

/** The authenticated user. Use in handlers mounted after authenticate. */
export function currentUser(req: Request): Express.AuthUser {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Not authenticated');
  return req.user;
}
