import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { PROJECT_ROLES } from '@ticketing/shared';

const projectMemberSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: PROJECT_ROLES, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

projectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });
projectMemberSchema.index({ userId: 1 });

export type ProjectMemberDoc = HydratedDocument<InferSchemaType<typeof projectMemberSchema>>;
export const ProjectMember = model('ProjectMember', projectMemberSchema, 'projectMembers');
