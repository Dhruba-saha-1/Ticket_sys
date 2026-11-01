import type {
  AcceptInviteInput,
  ChangePasswordInput,
  LoginInput,
  MeResponse,
  ResetPasswordInput,
  UserDTO,
} from '@ticketing/shared';
import { logger } from '../../config/logger';
import { bus } from '../../events/bus';
import { AppError } from '../../lib/AppError';
import { hashPassword, verifyAgainstDummy, verifyPassword } from '../../lib/password';
import { generateOpaqueToken, hashToken, signAccessToken } from '../../lib/tokens';
import { InviteToken, PasswordResetToken, RefreshToken, type RevokeReason, type UserDoc } from '../../models';
import * as membershipsService from '../memberships/memberships.service';
import * as usersService from '../users/users.service';

const HOUR_MS = 60 * 60 * 1000;
export const REFRESH_TOKEN_TTL_MS = 14 * 24 * HOUR_MS;
export const INVITE_TTL_MS = 72 * HOUR_MS;
export const PASSWORD_RESET_TTL_MS = HOUR_MS;

export interface SessionContext {
  userAgent?: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: UserDTO;
}

async function issueSession(user: UserDoc, ctx: SessionContext): Promise<Session> {
  const refreshToken = generateOpaqueToken();
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiresAt,
    userAgent: ctx.userAgent,
  });

  return {
    accessToken: signAccessToken({ sub: user.id, isSuperAdmin: user.isSuperAdmin }),
    refreshToken,
    refreshExpiresAt,
    user: usersService.toUserDTO(user),
  };
}

/** Revokes every live refresh token for the user (password change, disable, reuse detection). */
export async function revokeAllSessions(userId: string, reason: RevokeReason = 'revoked'): Promise<void> {
  await RefreshToken.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date(), revokedReason: reason } });
}

export async function login({ email, password }: LoginInput, ctx: SessionContext): Promise<Session> {
  const user = await usersService.findByEmailWithPassword(email);
  const valid = user?.passwordHash
    ? await verifyPassword(user.passwordHash, password)
    : await verifyAgainstDummy(password);

  if (!user || !valid || user.status !== 'active') {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password');
  }
  return issueSession(user, ctx);
}

/** Rotates the refresh token. Reusing a revoked token revokes the whole family (§7). */
export async function refresh(token: string | undefined, ctx: SessionContext): Promise<Session> {
  if (!token) throw new AppError('UNAUTHENTICATED', 'Missing refresh token');

  const tokenHash = hashToken(token);
  const now = new Date();
  // Atomically claim the token so two concurrent refreshes cannot both succeed.
  const current = await RefreshToken.findOneAndUpdate(
    { tokenHash, revokedAt: null },
    { $set: { revokedAt: now, revokedReason: 'rotated' } },
  );

  if (!current) {
    const reused = await RefreshToken.findOne({ tokenHash });
    if (reused?.revokedReason === 'rotated') {
      logger.warn({ userId: reused.userId.toString() }, 'Refresh token reuse detected, revoking all sessions');
      await revokeAllSessions(reused.userId.toString());
    }
    throw new AppError('UNAUTHENTICATED', 'Invalid refresh token');
  }

  if (current.expiresAt <= now) throw new AppError('UNAUTHENTICATED', 'Refresh token expired');

  const user = await usersService.findActiveById(current.userId.toString());
  if (!user) throw new AppError('UNAUTHENTICATED', 'User is not active');

  return issueSession(user, ctx);
}

export async function logout(token: string | undefined, userId: string): Promise<void> {
  if (!token) return;
  await RefreshToken.updateOne(
    { tokenHash: hashToken(token), userId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: 'logout' } },
  );
}

/** Creates a fresh invite (revoking older ones) and emails it. Used by user management. */
export async function issueInvite(user: UserDoc): Promise<{ token: string; expiresAt: Date }> {
  await InviteToken.deleteMany({ userId: user._id, usedAt: null });

  const token = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  await InviteToken.create({ userId: user._id, tokenHash: hashToken(token), expiresAt });

  bus.emit('user.invited', { userId: user.id, email: user.email, name: user.name, token, expiresAt });
  return { token, expiresAt };
}

export async function acceptInvite({ token, password }: AcceptInviteInput, ctx: SessionContext): Promise<Session> {
  const now = new Date();
  const invite = await InviteToken.findOneAndUpdate(
    { tokenHash: hashToken(token), usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } },
  );
  if (!invite) throw new AppError('INVALID_TOKEN', 'Invite link is invalid or has expired');

  const user = await usersService.activateWithPassword(invite.userId.toString(), await hashPassword(password));
  if (!user) throw new AppError('INVALID_TOKEN', 'Invite link is invalid or has expired');

  return issueSession(user, ctx);
}

/** Always succeeds from the caller's point of view so emails cannot be enumerated. */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await usersService.findByEmail(email);
  if (!user || user.status !== 'active') return;

  await PasswordResetToken.deleteMany({ userId: user._id, usedAt: null });

  const token = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  await PasswordResetToken.create({ userId: user._id, tokenHash: hashToken(token), expiresAt });

  bus.emit('user.password_reset_requested', {
    userId: user.id,
    email: user.email,
    name: user.name,
    token,
    expiresAt,
  });
}

export async function resetPassword({ token, password }: ResetPasswordInput, ctx: SessionContext): Promise<Session> {
  const now = new Date();
  const reset = await PasswordResetToken.findOneAndUpdate(
    { tokenHash: hashToken(token), usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } },
  );
  if (!reset) throw new AppError('INVALID_TOKEN', 'Reset link is invalid or has expired');

  const user = await usersService.findActiveById(reset.userId.toString());
  if (!user) throw new AppError('INVALID_TOKEN', 'Reset link is invalid or has expired');

  await usersService.setPassword(user.id, await hashPassword(password));
  await revokeAllSessions(user.id);
  return issueSession(user, ctx);
}

export async function getMe(userId: string): Promise<MeResponse> {
  const user = await usersService.findById(userId);
  if (!user) throw new AppError('NOT_FOUND', 'User not found');
  return { user: usersService.toUserDTO(user), memberships: await membershipsService.listForUser(userId) };
}

/** Changes the password, signs out every other session and returns a fresh one. */
export async function changePassword(
  userId: string,
  { currentPassword, newPassword }: ChangePasswordInput,
  ctx: SessionContext,
): Promise<Session> {
  const user = await usersService.findByIdWithPassword(userId);
  if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new AppError('VALIDATION_ERROR', 'Current password is incorrect');
  }

  await usersService.setPassword(userId, await hashPassword(newPassword));
  await revokeAllSessions(userId);
  return issueSession(user, ctx);
}
