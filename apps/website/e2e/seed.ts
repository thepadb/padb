import type { Area, NameHistoryEntry, Park, StatusHistoryEntry } from '@padb/api-client';
import { internalApiUrl } from './servers';

export type NewPark = {
    name: string;
    country: string;
    status_history?: Array<StatusHistoryEntry>;
    name_history?: Array<NameHistoryEntry>;
    areas?: Array<Pick<Area, 'name'>>;
};

/** Adds a Park through the internal API, as Contributors' edits will. Names get a suffix so parallel tests never clash. */
export async function addPark(park: NewPark): Promise<Park> {
    const response = await fetch(`${internalApiUrl}/parks`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...park, name: `${park.name} ${crypto.randomUUID().slice(0, 8)}` }),
    });
    if (!response.ok) {
        throw new Error(`The internal API answered ${response.status}: ${await response.text()}`);
    }
    return response.json();
}
