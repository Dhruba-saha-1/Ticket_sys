import { ASSIGNABLE_ROLES, PERMISSIONS, can } from '../src/permissions';

describe('can()', () => {
  it('matches the PERMISSIONS matrix for every actor', () => {
    const actors = ['super_admin', 'project_head', 'customer', 'member'] as const;
    for (const perm of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]) {
      for (const actor of actors) {
        expect(can(actor, perm)).toBe((PERMISSIONS[perm] as readonly string[]).includes(actor));
      }
    }
  });

  it('restricts platform permissions to super admin', () => {
    expect(can('super_admin', 'project:manage')).toBe(true);
    expect(can('project_head', 'project:manage')).toBe(false);
    expect(can('project_head', 'user:manage')).toBe(false);
  });

  it('lets only SA and PH assign, and only members be assigned', () => {
    expect(can('member', 'ticket:assign')).toBe(false);
    expect(can('customer', 'ticket:assign')).toBe(false);
    expect(ASSIGNABLE_ROLES).toEqual(['member']);
  });
});
