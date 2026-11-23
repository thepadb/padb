// Typed client for the public PADB API; regenerate `schema.gen.ts` with `just generate`.
import createClient from 'openapi-fetch';
import type { components, paths } from './schema.gen';

export type Area = components['schemas']['Area'];
export type NameHistoryEntry = components['schemas']['NameHistoryEntry'];
export type Park = components['schemas']['Park'];
export type Status = components['schemas']['Status'];
export type StatusHistoryEntry = components['schemas']['StatusHistoryEntry'];

export function createApiClient(baseUrl: string) {
    return createClient<paths>({ baseUrl });
}
