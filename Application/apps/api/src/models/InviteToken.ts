import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

// Single use, valid for 72 hours.
const inviteTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
});

inviteTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type InviteTokenDoc = HydratedDocument<InferSchemaType<typeof inviteTokenSchema>>;
export const InviteToken = model('InviteToken', inviteTokenSchema, 'inviteTokens');
