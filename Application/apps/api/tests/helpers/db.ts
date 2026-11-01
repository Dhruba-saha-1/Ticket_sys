import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as models from '../../src/models';

let mongo: MongoMemoryServer | undefined;

export async function startDb(): Promise<void> {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  // Build unique / TTL indexes before tests rely on them.
  await Promise.all(Object.values(models).filter((m) => typeof m === 'function' && 'init' in m).map((m) => (m as typeof mongoose.Model).init()));
}

export async function clearDb(): Promise<void> {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

export async function stopDb(): Promise<void> {
  await mongoose.disconnect();
  await mongo?.stop();
}

/** Registers start / clear / stop hooks for an integration test file. */
export function useTestDb(): void {
  beforeAll(startDb);
  afterEach(clearDb);
  afterAll(stopDb);
}
