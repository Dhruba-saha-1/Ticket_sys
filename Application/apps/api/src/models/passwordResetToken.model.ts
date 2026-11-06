import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

// Single use, valid for 1 hour.
const passwordResetTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
});

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type PasswordResetTokenDoc = HydratedDocument<InferSchemaType<typeof passwordResetTokenSchema>>;
export const PasswordResetToken = model('PasswordResetToken', passwordResetTokenSchema, 'passwordResetTokens');
