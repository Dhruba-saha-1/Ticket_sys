import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

// Only 'rotated' tokens trigger family revocation when replayed.
export const REVOKE_REASONS = ['rotated', 'logout', 'revoked'] as const;
export type RevokeReason = (typeof REVOKE_REASONS)[number];

const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, enum: REVOKE_REASONS, default: null },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Revoked tokens are kept until expiry so reuse can be detected; Mongo drops them afterwards.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RefreshTokenDoc = HydratedDocument<InferSchemaType<typeof refreshTokenSchema>>;
export const RefreshToken = model('RefreshToken', refreshTokenSchema, 'refreshTokens');
