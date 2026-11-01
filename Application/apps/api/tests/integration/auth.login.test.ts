import request from 'supertest';
import { createApp } from '../../src/app';
import { RefreshToken } from '../../src/models';
import { useTestDb } from '../helpers/db';
import { DEFAULT_PASSWORD, createUser, refreshCookieHeader } from '../helpers/fixtures';

useTestDb();
const app = createApp();

const login = (email: string, password: string) =>
  request(app).post('/api/v1/auth/login').send({ email, password });

describe('POST /auth/login', () => {
  it('returns an access token and sets an httpOnly refresh cookie', async () => {
    const user = await createUser({ email: 'pat@example.com' });

    const res = await login('PAT@example.com', DEFAULT_PASSWORD);

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.user).toMatchObject({ id: user.id, email: 'pat@example.com', isSuperAdmin: false });
    expect(res.body.user).not.toHaveProperty('passwordHash');

    const cookie = refreshCookieHeader(res)!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
  });

  it('stores only a hash of the refresh token', async () => {
    await createUser({ email: 'pat@example.com' });
    const res = await login('pat@example.com', DEFAULT_PASSWORD);
    const raw = refreshCookieHeader(res)!.split(';')[0].split('=')[1];

    const stored = await RefreshToken.findOne();
    expect(stored!.tokenHash).not.toBe(raw);
    expect(await RefreshToken.countDocuments({ tokenHash: raw })).toBe(0);
  });

  it.each([
    ['wrong password', { status: 'active' as const }, 'wrong-password'],
    ['disabled user', { status: 'disabled' as const }, DEFAULT_PASSWORD],
    ['invited user', { status: 'invited' as const }, DEFAULT_PASSWORD],
  ])('rejects %s with INVALID_CREDENTIALS', async (_label, overrides, password) => {
    await createUser({ email: 'pat@example.com', ...overrides });

    const res = await login('pat@example.com', password);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(refreshCookieHeader(res)).toBeUndefined();
  });

  it('gives the same answer for an unknown email', async () => {
    const res = await login('nobody@example.com', DEFAULT_PASSWORD);
    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
  });

  it('validates the body, including operator injection attempts', async () => {
    const missing = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe('VALIDATION_ERROR');

    const injection = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } });
    expect(injection.status).toBe(400);
  });
});
