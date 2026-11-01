import jwt from 'jsonwebtoken';
import { AppError } from '../../src/lib/AppError';
import { generateOpaqueToken, hashToken, signAccessToken, verifyAccessToken } from '../../src/lib/tokens';

describe('access tokens', () => {
  it('round-trips { sub, isSuperAdmin }', () => {
    const token = signAccessToken({ sub: 'abc', isSuperAdmin: true });
    expect(verifyAccessToken(token)).toEqual({ sub: 'abc', isSuperAdmin: true });
  });

  it('expires after 15 minutes', () => {
    const token = signAccessToken({ sub: 'abc', isSuperAdmin: false });
    const { iat, exp } = jwt.decode(token) as { iat: number; exp: number };
    expect(exp - iat).toBe(15 * 60);
  });

  it('rejects expired, tampered and foreign-secret tokens', () => {
    const expired = jwt.sign({ sub: 'abc', exp: Math.floor(Date.now() / 1000) - 10 }, process.env.JWT_ACCESS_SECRET!);
    const foreign = jwt.sign({ sub: 'abc' }, 'some-other-secret-that-is-long-enough!!');
    const tampered = signAccessToken({ sub: 'abc', isSuperAdmin: false }).slice(0, -2) + 'xx';

    for (const token of [expired, foreign, tampered, 'garbage']) {
      expect(() => verifyAccessToken(token)).toThrow(AppError);
    }
  });

  it('rejects alg "none"', () => {
    const unsigned = jwt.sign({ sub: 'abc', isSuperAdmin: true }, '', { algorithm: 'none' });
    expect(() => verifyAccessToken(unsigned)).toThrow(AppError);
  });
});

describe('opaque tokens', () => {
  it('are random and hashed deterministically', () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).not.toContain(a);
  });
});
