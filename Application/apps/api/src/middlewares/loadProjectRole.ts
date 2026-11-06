import type { Request } from 'express';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/http';
import * as membershipService from '../services/membership.service';

type ProjectIdResolver = (req: Request) => string | undefined | Promise<string | undefined>;

/**
 * Resolves the caller's role in the project → req.role.
 * Super Admin is 'super_admin' even without a membership row (§9).
 */
export const loadProjectRole = (getProjectId: ProjectIdResolver = (req) => req.params.id) =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user) throw new AppError('UNAUTHENTICATED', 'Not authenticated');

    if (req.user.isSuperAdmin) {
      req.role = 'super_admin';
      return next();
    }

    const projectId = await getProjectId(req);
    const role = projectId ? await membershipService.getRole(projectId, req.user.id) : null;
    if (!role) throw new AppError('FORBIDDEN', 'You are not a member of this project');

    req.role = role;
    next();
  });
