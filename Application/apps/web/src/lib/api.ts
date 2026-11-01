import { createApiClient } from '@ticketing/api-client';

// Access token handling and refresh-on-401 are wired up in lib/auth.tsx (web phase).
export const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
});
