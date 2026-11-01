import { isValidObjectId } from 'mongoose';
import type { MembershipDTO, ProjectRole } from '@ticketing/shared';
import { ProjectMember } from '../../models';

export async function listForUser(userId: string): Promise<MembershipDTO[]> {
  const rows = await ProjectMember.find({ userId }).sort({ createdAt: 1 }).lean();
  return rows.map((row) => ({ projectId: row.projectId.toString(), role: row.role }));
}

export async function getRole(projectId: string, userId: string): Promise<ProjectRole | null> {
  if (!isValidObjectId(projectId)) return null;
  const row = await ProjectMember.findOne({ projectId, userId }).lean();
  return row?.role ?? null;
}
