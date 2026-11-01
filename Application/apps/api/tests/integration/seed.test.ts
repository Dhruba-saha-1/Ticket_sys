import { User } from '../../src/models';
import { seedSuperAdmin } from '../../src/scripts/seed';
import { useTestDb } from '../helpers/db';
import { createUser } from '../helpers/fixtures';

useTestDb();

describe('seedSuperAdmin', () => {
  it('creates an active Super Admin when there are no users', async () => {
    const result = await seedSuperAdmin({ email: 'Admin@Example.com', password: 'Bootstrap123!' });

    expect(result).toBe('created');
    const admin = await User.findOne({ email: 'admin@example.com' }).select('+passwordHash');
    expect(admin).toMatchObject({ isSuperAdmin: true, status: 'active', name: 'Super Admin' });
    expect(admin!.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('does nothing once any user exists', async () => {
    await createUser();

    expect(await seedSuperAdmin({ email: 'admin@example.com', password: 'Bootstrap123!' })).toBe('skipped');
    expect(await User.countDocuments({ isSuperAdmin: true })).toBe(0);
  });

  it('fails loudly without bootstrap credentials', async () => {
    await expect(seedSuperAdmin({ email: undefined, password: undefined })).rejects.toThrow(/BOOTSTRAP_ADMIN/);
  });

  it('rejects a weak bootstrap password', async () => {
    await expect(seedSuperAdmin({ email: 'admin@example.com', password: 'short' })).rejects.toThrow();
  });
});
