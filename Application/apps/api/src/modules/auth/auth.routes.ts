import { Router } from 'express';
import {
  acceptInviteSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from '@ticketing/shared';
import { asyncHandler } from '../../lib/asyncHandler';
import { authenticate } from '../../middleware/authenticate';
import { authLimiter, userLimiters } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import * as controller from './auth.controller';

export const authRouter = Router();

authRouter.post('/login', authLimiter, validate({ body: loginSchema }), asyncHandler(controller.login));
authRouter.post('/refresh', asyncHandler(controller.refresh));
authRouter.post('/logout', authenticate, asyncHandler(controller.logout));
authRouter.post(
  '/forgot-password',
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(controller.forgotPassword),
);
authRouter.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  asyncHandler(controller.resetPassword),
);
authRouter.post(
  '/invite/accept',
  authLimiter,
  validate({ body: acceptInviteSchema }),
  asyncHandler(controller.acceptInvite),
);

export const meRouter = Router();

meRouter.use(authenticate, ...userLimiters);
meRouter.get('/', asyncHandler(controller.me));
meRouter.patch('/password', validate({ body: changePasswordSchema }), asyncHandler(controller.changePassword));
