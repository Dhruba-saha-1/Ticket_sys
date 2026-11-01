import type { ProjectRole } from './permissions';
import type { UserStatus } from './enums';

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  status: UserStatus;
  createdAt: string;
}

export interface MembershipDTO {
  projectId: string;
  role: ProjectRole;
}

export interface MeResponse {
  user: UserDTO;
  memberships: MembershipDTO[];
}

export interface AuthResponse {
  accessToken: string;
  user: UserDTO;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}
