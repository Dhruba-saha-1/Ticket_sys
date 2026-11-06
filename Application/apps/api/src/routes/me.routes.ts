import { Router } from 'express';
import { changePasswordSchema } from '@ticketing/shared';
import { asyncHandler } from '../utils/http';
import { authenticate } from '../middlewares/authenticate';
import { userLimiters } from '../middlewares/rateLimit';
import { validate } from '../middlewares/validate';
import * as controller from '../controllers/auth.controller';

/** Mounted at /api/v1/me */
export const meRouter = Router();

meRouter.use(authenticate, ...userLimiters);
meRouter.get('/', asyncHandler(controller.me));
meRouter.patch('/password', validate({ body: changePasswordSchema }), asyncHandler(controller.changePassword));
