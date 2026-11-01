import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../src/lib/AppError';
import { authorize, requireSuperAdmin } from '../../src/middleware/authorize';

const run = (handler: (req: Request, res: Response, next: NextFunction) => void, req: Partial<Request>) => {
  const next = jest.fn();
  handler(req as Request, {} as Response, next);
  return next.mock.calls[0]?.[0] as unknown;
};

describe('authorize()', () => {
  it('passes when the role has the permission', () => {
    expect(run(authorize('ticket:assign'), { role: 'project_head' })).toBeUndefined();
  });

  it('rejects with FORBIDDEN when it does not', () => {
    const err = run(authorize('ticket:assign'), { role: 'member' });
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe('FORBIDDEN');
  });

  it('rejects when no role was resolved', () => {
    expect(run(authorize('ticket:view'), {})).toBeInstanceOf(AppError);
  });
});

describe('requireSuperAdmin', () => {
  it('only lets Super Admins through', () => {
    const user = { id: '1', email: 'a@example.com', name: 'A' };
    expect(run(requireSuperAdmin, { user: { ...user, isSuperAdmin: true } })).toBeUndefined();
    expect(run(requireSuperAdmin, { user: { ...user, isSuperAdmin: false } })).toBeInstanceOf(AppError);
  });
});
