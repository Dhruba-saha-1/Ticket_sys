import { Router } from 'express';
import { authRouter } from './auth.routes';
import { meRouter } from './me.routes';

/** Every router, mounted at /api/v1 by app.ts. */
export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
apiRouter.use('/auth', authRouter);
apiRouter.use('/me', meRouter);
