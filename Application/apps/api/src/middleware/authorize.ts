import type { RequestHandler } from 'express';
import { can, type Permission } from '@ticketing/shared';
import { AppError } from '../lib/AppError';

/** Coarse permission check against the shared matrix. Resource rules live in services. */
export const authorize =
  (permission: Permission): RequestHandler =>
  (req, _res, next) => {
    if (!req.role || !can(req.role, permission)) {
      return next(new AppError('FORBIDDEN', `Role '${req.role ?? 'none'}' cannot perform '${permission}'`));
    }
    next();
  };

/** For platform routes that are not scoped to a project. */
export const requireSuperAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user?.isSuperAdmin) {
    return next(new AppError('FORBIDDEN', 'Super Admin only'));
  }
  next();
};
