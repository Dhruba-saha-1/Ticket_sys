import type { AuthResponse, ChangePasswordInput, MeResponse } from '@ticketing/shared';
import type { RequestFn } from '../client';

export const meEndpoints = (request: RequestFn) => ({
  get: () => request<MeResponse>('GET', '/me'),
  changePassword: (input: ChangePasswordInput) => request<AuthResponse>('PATCH', '/me/password', input),
});
