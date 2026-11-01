import { emailSchema, passwordSchema } from '@ticketing/shared';
import { connectDb, disconnectDb } from '../config/db';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { hashPassword } from '../lib/password';
import * as usersService from '../modules/users/users.service';

interface SeedOptions {
  email?: string;
  password?: string;
  name?: string;
}

/** Creates the first Super Admin when the users collection is empty (§7). No-op otherwise. */
export async function seedSuperAdmin({
  email = env.BOOTSTRAP_ADMIN_EMAIL,
  password = env.BOOTSTRAP_ADMIN_PASSWORD,
  name = env.BOOTSTRAP_ADMIN_NAME,
}: SeedOptions = {}): Promise<'created' | 'skipped'> {
  if ((await usersService.countUsers()) > 0) return 'skipped';

  if (!email || !password) {
    throw new Error('BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required to seed the first Super Admin');
  }

  await usersService.createSuperAdmin({
    name,
    email: emailSchema.parse(email),
    passwordHash: await hashPassword(passwordSchema.parse(password)),
  });
  return 'created';
}

if (require.main === module) {
  connectDb()
    .then(() => seedSuperAdmin())
    .then((result) => logger.info({ result }, 'Seed finished'))
    .catch((err: unknown) => {
      logger.fatal({ err }, 'Seed failed');
      process.exitCode = 1;
    })
    .finally(() => disconnectDb());
}
