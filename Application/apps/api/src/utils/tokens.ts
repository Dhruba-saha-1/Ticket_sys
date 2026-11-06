import { createHmac, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './AppError';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export interface AccessTokenPayload {
  sub: string;
  isSuperAdmin: boolean;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
      throw new Error('Malformed payload');
    }
    return { sub: decoded.sub, isSuperAdmin: decoded.isSuperAdmin === true };
  } catch {
    throw new AppError('UNAUTHENTICATED', 'Invalid or expired access token');
  }
}

/** Opaque random token for refresh, invite and password-reset flows. */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Tokens are stored as an HMAC so a database leak does not expose usable tokens. */
export function hashToken(token: string): string {
  return createHmac('sha256', env.JWT_REFRESH_SECRET).update(token).digest('hex');
}
