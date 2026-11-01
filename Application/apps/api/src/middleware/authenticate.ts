import { AppError } from '../lib/AppError';
import { asyncHandler } from '../lib/asyncHandler';
import { verifyAccessToken } from '../lib/tokens';
import * as usersService from '../modules/users/users.service';

/** Verifies the bearer access token and loads an active user into req.user. */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('UNAUTHENTICATED', 'Missing access token');
  }

  const payload = verifyAccessToken(header.slice('Bearer '.length));
  const user = await usersService.findActiveById(payload.sub);
  if (!user) {
    throw new AppError('UNAUTHENTICATED', 'User is not active');
  }

  req.user = { id: user.id, email: user.email, name: user.name, isSuperAdmin: user.isSuperAdmin };
  next();
});
