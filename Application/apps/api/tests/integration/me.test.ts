import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../../src/app';
import { ProjectMember, User } from '../../src/models';
import { useTestDb } from '../helpers/db';
import { bearer, createUser } from '../helpers/fixtures';

useTestDb();
const app = createApp();

describe('GET /me', () => {
  it('returns the user, isSuperAdmin and memberships', async () => {
    const user = await createUser({ isSuperAdmin: true, name: 'Sam' });
    const projectA = new Types.ObjectId();
    const projectB = new Types.ObjectId();
    await ProjectMember.create({ projectId: projectA, userId: user._id, role: 'project_head' });
    await ProjectMember.create({ projectId: projectB, userId: user._id, role: 'member' });

    const res = await request(app).get('/api/v1/me').set('Authorization', bearer(user));

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id, name: 'Sam', isSuperAdmin: true, status: 'active' });
    expect(res.body.memberships).toEqual([
      { projectId: projectA.toString(), role: 'project_head' },
      { projectId: projectB.toString(), role: 'member' },
    ]);
  });

  it('rejects a missing, malformed or expired access token', async () => {
    const user = await createUser();
    const expired = jwt.sign(
      { sub: user.id, isSuperAdmin: false, exp: Math.floor(Date.now() / 1000) - 1 },
      process.env.JWT_ACCESS_SECRET!,
    );

    for (const header of [undefined, 'Bearer nope', `Bearer ${expired}`, `Basic ${user.id}`]) {
      const req = request(app).get('/api/v1/me');
      const res = await (header ? req.set('Authorization', header) : req);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    }
  });

  it('rejects a valid token for a disabled user', async () => {
    const user = await createUser();
    const header = bearer(user);
    await User.updateOne({ _id: user._id }, { $set: { status: 'disabled' } });

    const res = await request(app).get('/api/v1/me').set('Authorization', header);
    expect(res.status).toBe(401);
  });
});
