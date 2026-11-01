import type { Actor } from '@ticketing/shared';

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      email: string;
      name: string;
      isSuperAdmin: boolean;
    }

    interface Request {
      user?: AuthUser;
      role?: Actor;
    }
  }
}

export {};
