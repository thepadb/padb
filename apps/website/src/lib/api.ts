import { createApiClient } from '@padb/api-client';

// Called only from server functions, so the API's address never reaches the browser.
export const api = createApiClient(process.env.API_URL ?? 'http://localhost:3000');
