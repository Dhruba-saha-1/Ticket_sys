import { isValidObjectId } from 'mongoose';
import type { UserDTO } from '@ticketing/shared';
import { User, type UserDoc } from '../../models';

export function toUserDTO(user: UserDoc): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isSuperAdmin: user.isSuperAdmin,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function findById(id: string): Promise<UserDoc | null> {
  return isValidObjectId(id) ? User.findById(id) : null;
}

export async function findActiveById(id: string): Promise<UserDoc | null> {
  return isValidObjectId(id) ? User.findOne({ _id: id, status: 'active' }) : null;
}

export async function findByIdWithPassword(id: string): Promise<UserDoc | null> {
  return isValidObjectId(id) ? User.findById(id).select('+passwordHash') : null;
}

export function findByEmail(email: string): Promise<UserDoc | null> {
  return User.findOne({ email: email.toLowerCase() });
}

export function findByEmailWithPassword(email: string): Promise<UserDoc | null> {
  return User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
}

export async function setPassword(id: string, passwordHash: string): Promise<void> {
  await User.updateOne({ _id: id }, { $set: { passwordHash } });
}

/** Activates an invited user. Returns null if the user is no longer in the invited state. */
export function activateWithPassword(id: string, passwordHash: string): Promise<UserDoc | null> {
  return User.findOneAndUpdate(
    { _id: id, status: 'invited' },
    { $set: { passwordHash, status: 'active' } },
    { new: true },
  );
}

export function countUsers(): Promise<number> {
  return User.countDocuments();
}

export function createSuperAdmin(input: { name: string; email: string; passwordHash: string }): Promise<UserDoc> {
  return User.create({ ...input, isSuperAdmin: true, status: 'active' });
}
