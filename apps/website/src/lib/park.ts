import type { Park } from '@padb/api-client';

const PARK_PARAM = /^([0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:-|$)/i;

/** The Park ID at the start of `<id>-<slug>`; the slug is cosmetic and ignored. See ADR 0008 */
export function parkId(param: string): string | undefined {
    return PARK_PARAM.exec(param)?.[1];
}

/** `<id>-<slug>` for a Park's URL, or just the ID when its name has no letters or digits. See ADR 0008 */
export function parkParam(park: Pick<Park, 'id' | 'name'>): string {
    const slug = park.name
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    return slug ? `${park.id}-${slug}` : park.id;
}

const countryNames = new Intl.DisplayNames(['en-GB'], { type: 'region' });

/** A Park's country in English, or its code if the name is unknown. */
export function countryName(park: Pick<Park, 'country'>): string {
    return countryNames.of(park.country) ?? park.country;
}
