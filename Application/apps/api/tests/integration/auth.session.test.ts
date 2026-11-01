import request from 'supertest';
import { createApp } from '../../src/app';
import { RefreshToken } from '../../src/models';
import { useTestDb } from '../helpers/db';
import { DEFAULT_PASSWORD, createUser, refreshCookie, refreshCookieHeader } from '../helpers/fixtures';

useTestDb();
const app = createApp();

async function loginAs(email: string) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: DEFAULT_PASSWORD });
  return { accessToken: res.body.accessToken as string, cookie: refreshCookie(res) };
}

const refresh = (cookie?: string) => {
  const req = request(app).post('/api/v1/auth/refresh');
  return cookie ? req.set('Cookie', cookie) : req;
};

describe('POST /auth/refresh', () => {
  it('rotates the refresh token and returns a new access token', async () => {
    await createUser({ email: 'pat@example.com' });
    const { cookie } = await loginAs('pat@example.com');

    const res = await refresh(cookie);

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
    expect(refreshCookie(res)).not.toBe(cookie);

    const old = await refresh(cookie);
    expect(old.status).toBe(401);
  });

  it('revokes every session when a revoked token is reused', async () => {
    const user = await createUser({ email: 'pat@example.com' });
    const first = await loginAs('pat@example.com');
    const otherDevice = await loginAs('pat@example.com');

    const rotated = await refresh(first.cookie);
    expect(rotated.status).toBe(200);

    // An attacker replays the stolen, already-rotated token.
    expect((await refresh(first.cookie)).status).toBe(401);

    expect(await RefreshToken.countDocuments({ userId: user._id, revokedAt: null })).toBe(0);
    expect((await refresh(refreshCookie(rotated))).status).toBe(401);
    expect((await refresh(otherDevice.cookie)).status).toBe(401);
  });

  it('rejects an expired refresh token', async () => {
    await createUser({ email: 'pat@example.com' });
    const { cookie } = await loginAs('pat@example.com');
    await RefreshToken.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await refresh(cookie);
    expect(res.status).toBe(401);
  });

  it('rejects a missing or unknown token and clears the cookie', async () => {
    const missing = await refresh();
    expect(missing.status).toBe(401);
    expect(missing.body.error.code).toBe('UNAUTHENTICATED');

    const unknown = await refresh('refresh_token=not-a-real-token');
    expect(unknown.status).toBe(401);
    expect(refreshCookieHeader(unknown)).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it('rejects refresh for a user disabled after login', async () => {
    const user = await createUser({ email: 'pat@example.com' });
    const { cookie } = await loginAs('pat@example.com');
    user.status = 'disabled';
    await user.save();

    expect((await refresh(cookie)).status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('revokes the current refresh token and clears the cookie', async () => {
    await createUser({ email: 'pat@example.com' });
    const { accessToken, cookie } = await loginAs('pat@example.com');

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', cookie);

    expect(res.status).toBe(204);
    expect(refreshCookieHeader(res)).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect((await refresh(cookie)).status).toBe(401);
  });

  it('replaying a logged-out token does not sign out other sessions', async () => {
    await createUser({ email: 'pat@example.com' });
    const laptop = await loginAs('pat@example.com');
    const phone = await loginAs('pat@example.com');

    await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${laptop.accessToken}`)
      .set('Cookie', laptop.cookie);

    expect((await refresh(laptop.cookie)).status).toBe(401);
    expect((await refresh(phone.cookie)).status).toBe(200);
  });

  it('requires authentication', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(401);
  });
});
