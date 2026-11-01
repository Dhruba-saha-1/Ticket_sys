import { createRequest, type ApiClientOptions } from './client';
import { authEndpoints } from './endpoints/auth';
import { meEndpoints } from './endpoints/me';

export * from './client';

export function createApiClient(options: ApiClientOptions) {
  const request = createRequest(options);
  return {
    request,
    auth: authEndpoints(request),
    me: meEndpoints(request),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
