'use client';

import { can, type Actor, type Permission } from '@ticketing/shared';
import type { ReactNode } from 'react';

/** Hides actions the role cannot perform. The API still enforces every rule. */
export function Can({ role, perm, children }: { role: Actor | undefined; perm: Permission; children: ReactNode }) {
  return role && can(role, perm) ? <>{children}</> : null;
}
