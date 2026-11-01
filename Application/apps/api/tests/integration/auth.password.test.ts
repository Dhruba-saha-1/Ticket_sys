import request from 'supertest';
import { createApp } from '../../src/app';
import { PasswordResetToken, RefreshToken } from '../../src/models';
import { useTestDb } from '../helpers/db';
import { DEFAULT_PASSWORD, bearer, createUser, refreshCookie } from '../helpers/fixtures';
import { mailTo, sentMail, tokenFromMail, useFakeMail } from '../helpers/mail';

useTestDb();
useFakeMail();
const app = createApp();

const forgot = (email: string) => request(app).post('/api/v1/auth/forgot-password').send({ email });
const reset = (token: string, password = 'BrandNew123!') =>
  request(app).post('/api/v1/auth/reset-password').send({ token, password });
const login = (email: string, password: string) =>
  request(app).post('/api/v1/auth/login').send({ email, password });

async function requestResetToken(email: string): Promise<string> {
  await forgot(email);
  const [mail] = await mailTo(email);
  return tokenFromMail(mail, 'reset');
}

describe('POST /auth/forgot-password', () => {
  it('returns 202 and emails a reset link to an active user', async () => {
    await createUser({ email: 'pat@example.com' });

    const res = await forgot('pat@example.com');

    expect(res.status).toBe(202);
    const [mail] = await mailTo('pat@example.com');
    expect(mail.text).toContain('http://localhost:3000/login?reset=');
    expect(mail.text).toContain('1 hour');
  });

  it.each([
    ['unknown', undefined],
    ['disabled', 'disabled' as const],
    ['invited', 'invited' as const],
  ])('returns 202 without sending mail for an %s account', async (_label, status) => {
    if (status) await createUser({ email: 'pat@example.com', status });

    const res = await forgot('pat@example.com');

    expect(res.status).toBe(202);
    expect(await mailTo('pat@example.com')).toHaveLength(0);
    expect(sentMail).toHaveLength(0);
  });
});

describe('POST /auth/reset-password', () => {
  it('sets the new password and signs out every existing session', async () => {
    await createUser({ email: 'pat@example.com' });
    const before = await login('pat@example.com', DEFAULT_PASSWORD);
    const token = await requestResetToken('pat@example.com');

    const res = await reset(token);

    expect(res.status).toBe(200);
    expect((await login('pat@example.com', DEFAULT_PASSWORD)).status).toBe(401);
    expect((await login('pat@example.com', 'BrandNew123!')).status).toBe(200);
    const oldRefresh = await request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie(before));
    expect(oldRefresh.status).toBe(401);
  });

  it('is single use', async () => {
    await createUser({ email: 'pat@example.com' });
    const token = await requestResetToken('pat@example.com');

    expect((await reset(token)).status).toBe(200);
    const again = await reset(token, 'Another123!');
    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe('INVALID_TOKEN');
  });

  it('expires after 1 hour', async () => {
    await createUser({ email: 'pat@example.com' });
    const token = await requestResetToken('pat@example.com');
    const stored = await PasswordResetToken.findOne();
    expect(stored!.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(3600 * 1000);

    await PasswordResetToken.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await reset(token)).status).toBe(400);
  });

  it('invalidates an older reset link when a new one is requested', async () => {
    await createUser({ email: 'pat@example.com' });
    const first = await requestResetToken('pat@example.com');
    sentMail.length = 0;
    const second = await requestResetToken('pat@example.com');

    expect((await reset(first)).status).toBe(400);
    expect((await reset(second)).status).toBe(200);
  });
});

describe('PATCH /me/password', () => {
  it('requires the current password', async () => {
    const user = await createUser();

    const res = await request(app)
      .patch('/api/v1/me/password')
      .set('Authorization', bearer(user))
      .send({ currentPassword: 'wrong-password', newPassword: 'BrandNew123!' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('changes the password, revokes other sessions and issues a new one', async () => {
    const user = await createUser({ email: 'pat@example.com' });
    const otherDevice = await login('pat@example.com', DEFAULT_PASSWORD);

    const res = await request(app)
      .patch('/api/v1/me/password')
      .set('Authorization', bearer(user))
      .send({ currentPassword: DEFAULT_PASSWORD, newPassword: 'BrandNew123!' });

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
    expect(await RefreshToken.countDocuments({ userId: user._id, revokedAt: null })).toBe(1);

    const stale = await request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie(otherDevice));
    expect(stale.status).toBe(401);
    const fresh = await request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie(res));
    expect(fresh.status).toBe(200);
  });
});
