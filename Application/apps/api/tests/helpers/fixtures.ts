import type { Response } from 'supertest';
import { hashPassword } from '../../src/lib/password';
import { signAccessToken } from '../../src/lib/tokens';
import { User, type UserDoc } from '../../src/models';

export const DEFAULT_PASSWORD = 'Password123!';

let counter = 0;

export async function createUser(
  overrides: Partial<{
    name: string;
    email: string;
    password: string;
    isSuperAdmin: boolean;
    status: 'active' | 'invited' | 'disabled';
  }> = {},
): Promise<UserDoc> {
  counter += 1;
  const status = overrides.status ?? 'active';
  const password = overrides.password ?? DEFAULT_PASSWORD;
  return User.create({
    name: overrides.name ?? `Test User ${counter}`,
    email: overrides.email ?? `user${counter}@example.com`,
    passwordHash: status === 'invited' ? null : await hashPassword(password),
    isSuperAdmin: overrides.isSuperAdmin ?? false,
    status,
  });
}

export function bearer(user: UserDoc): string {
  return `Bearer ${signAccessToken({ sub: user.id, isSuperAdmin: user.isSuperAdmin })}`;
}

/** Returns the raw `refresh_token=...` Set-Cookie header, if any. */
export function refreshCookieHeader(res: Response): string | undefined {
  const raw = res.headers['set-cookie'] as unknown;
  const cookies = Array.isArray(raw) ? (raw as string[]) : typeof raw === 'string' ? [raw] : [];
  return cookies.find((cookie) => cookie.startsWith('refresh_token='));
}

/** Returns `refresh_token=<value>` ready to send back as a Cookie header. */
export function refreshCookie(res: Response): string {
  const header = refreshCookieHeader(res);
  if (!header) throw new Error('No refresh_token cookie set');
  return header.split(';')[0];
}
