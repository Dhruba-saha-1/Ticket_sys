import request from 'supertest';
import { createApp } from '../../src/app';
import { InviteToken, User } from '../../src/models';
import * as authService from '../../src/modules/auth/auth.service';
import { useTestDb } from '../helpers/db';
import { createUser, refreshCookieHeader } from '../helpers/fixtures';
import { mailTo, tokenFromMail, useFakeMail } from '../helpers/mail';

useTestDb();
useFakeMail();
const app = createApp();

const accept = (token: string, password = 'NewPassword1!') =>
  request(app).post('/api/v1/auth/invite/accept').send({ token, password });

describe('invites', () => {
  it('emails a set-password link to the invitee', async () => {
    const user = await createUser({ email: 'new@example.com', name: 'Nia', status: 'invited' });

    await authService.issueInvite(user);

    const [mail] = await mailTo('new@example.com');
    expect(mail.from).toBe('no-reply@example.com');
    expect(mail.subject).toMatch(/invited/i);
    expect(mail.text).toContain('Hi Nia');
    expect(mail.text).toContain('http://localhost:3000/login?invite=');
    expect(mail.text).toContain('72 hours');
  });

  it('activates the user, sets the password and starts a session', async () => {
    const user = await createUser({ email: 'new@example.com', status: 'invited' });
    await authService.issueInvite(user);
    const token = tokenFromMail((await mailTo('new@example.com'))[0], 'invite');

    const res = await accept(token);

    expect(res.status).toBe(200);
    expect(res.body.user.status).toBe('active');
    expect(refreshCookieHeader(res)).toBeDefined();

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'new@example.com', password: 'NewPassword1!' });
    expect(login.status).toBe(200);
  });

  it('is single use', async () => {
    const user = await createUser({ status: 'invited' });
    const { token } = await authService.issueInvite(user);

    expect((await accept(token)).status).toBe(200);
    const again = await accept(token);
    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe('INVALID_TOKEN');
  });

  it('expires after 72 hours', async () => {
    const user = await createUser({ status: 'invited' });
    const { token, expiresAt } = await authService.issueInvite(user);
    expect(expiresAt.getTime() - Date.now()).toBeGreaterThan(71.9 * 3600 * 1000);
    expect(expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(72 * 3600 * 1000);

    await InviteToken.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    expect((await accept(token)).status).toBe(400);
    expect((await User.findById(user.id))!.status).toBe('invited');
  });

  it('revokes the previous invite when re-invited', async () => {
    const user = await createUser({ status: 'invited' });
    const first = await authService.issueInvite(user);
    const second = await authService.issueInvite(user);

    expect((await accept(first.token)).status).toBe(400);
    expect((await accept(second.token)).status).toBe(200);
  });

  it('rejects weak passwords', async () => {
    const user = await createUser({ status: 'invited' });
    const { token } = await authService.issueInvite(user);

    const res = await accept(token, 'short');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('does not reactivate a user disabled after being invited', async () => {
    const user = await createUser({ status: 'invited' });
    const { token } = await authService.issueInvite(user);
    await User.updateOne({ _id: user._id }, { $set: { status: 'disabled' } });

    expect((await accept(token)).status).toBe(400);
    expect((await User.findById(user.id))!.status).toBe('disabled');
  });
});
