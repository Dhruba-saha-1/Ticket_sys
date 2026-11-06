import { Router } from 'express';
import { acceptInviteSchema, forgotPasswordSchema, loginSchema, resetPasswordSchema } from '@ticketing/shared';
import { asyncHandler } from '../utils/http';
import { authenticate } from '../middlewares/authenticate';
import { authLimiter } from '../middlewares/rateLimit';
import { validate } from '../middlewares/validate';
import * as controller from '../controllers/auth.controller';

/** Mounted at /api/v1/auth */
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
