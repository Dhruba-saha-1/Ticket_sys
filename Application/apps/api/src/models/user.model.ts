import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { USER_STATUSES } from '@ticketing/shared';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // null while status = invited. Excluded from queries unless explicitly selected.
    passwordHash: { type: String, default: null, select: false },
    isSuperAdmin: { type: Boolean, default: false },
    status: { type: String, enum: USER_STATUSES, default: 'invited', required: true },
  },
  { timestamps: true },
);

export type UserFields = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<UserFields>;
export const User = model('User', userSchema);
