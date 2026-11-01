import request from 'supertest';
import { createApp } from '../../src/app';
import { setRateLimitEnabled } from '../../src/middleware/rateLimit';
import { useTestDb } from '../helpers/db';

useTestDb();
const app = createApp();

beforeAll(() => setRateLimitEnabled(true));
afterAll(() => setRateLimitEnabled(false));

describe('auth rate limit', () => {
  it('allows 10 credential attempts per 15 minutes per IP, then returns 429', async () => {
    const attempt = () =>
      request(app).post('/api/v1/auth/login').send({ email: 'pat@example.com', password: 'x' });

    for (let i = 0; i < 10; i++) {
      expect((await attempt()).status).toBe(401);
    }

    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });
});
