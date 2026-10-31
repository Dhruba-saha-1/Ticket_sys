export const PROJECT_ROLES = ['project_head', 'customer', 'member'] as const;
export type ProjectRole = typeof PROJECT_ROLES[number];

export const PERMISSIONS = {
  'project:manage':    ['super_admin'],
  'user:manage':       ['super_admin'],
  'member:manage':     ['super_admin', 'project_head'],
  'ticket:create':     ['super_admin', 'project_head', 'customer', 'member'],
  'ticket:assign':     ['super_admin', 'project_head'],
  'ticket:edit':       ['super_admin', 'project_head', 'customer'],
  'ticket:status':     ['super_admin', 'project_head', 'member'],
  'ticket:view':       ['super_admin', 'project_head', 'customer', 'member'],
  'insights:view':     ['super_admin', 'project_head', 'customer', 'member'],
} as const;

export const ASSIGNABLE_ROLES: ProjectRole[] = ['member'];

export const can = (
  actor: 'super_admin' | ProjectRole,
  perm: keyof typeof PERMISSIONS,
) => (PERMISSIONS[perm] as readonly string[]).includes(actor);
