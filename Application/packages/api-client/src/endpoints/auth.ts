import type {
  AcceptInviteInput,
  AuthResponse,
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
} from '@ticketing/shared';
import type { RequestFn } from '../client';

export const authEndpoints = (request: RequestFn) => ({
  login: (input: LoginInput) => request<AuthResponse>('POST', '/auth/login', input),
  refresh: () => request<AuthResponse>('POST', '/auth/refresh'),
  logout: () => request<void>('POST', '/auth/logout'),
  forgotPassword: (input: ForgotPasswordInput) => request<{ message: string }>('POST', '/auth/forgot-password', input),
  resetPassword: (input: ResetPasswordInput) => request<AuthResponse>('POST', '/auth/reset-password', input),
  acceptInvite: (input: AcceptInviteInput) => request<AuthResponse>('POST', '/auth/invite/accept', input),
});
