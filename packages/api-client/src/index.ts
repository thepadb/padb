// Typed client for the public PADB API; regenerate `schema.gen.ts` with `just generate`.
import createClient from 'openapi-fetch';
import type { components, paths } from './schema.gen';

export type Park = components['schemas']['Park'];

export function createApiClient(baseUrl: string) {
    return createClient<paths>({ baseUrl });
}
