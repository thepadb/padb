import type { Status } from '@padb/api-client';

const statusNames: Record<Status, string> = {
    announced: 'Announced',
    under_construction: 'Under construction',
    operating: 'Operating',
    refurbishing: 'Refurbishing',
    sbno: 'SBNO',
    closed: 'Closed',
    demolished: 'Demolished',
    relocated: 'Relocated',
};

/** A Status as shown to people. */
export function statusName(status: Status): string {
    return statusNames[status];
}

/** How a Status's mark is coloured: its tone token, `status-<tone>`. Never shown without the Status's name. */
export type StatusTone = 'operating' | 'paused' | 'stopped' | 'none';

const statusTones: Record<Status, StatusTone> = {
    announced: 'none',
    under_construction: 'paused',
    operating: 'operating',
    refurbishing: 'paused',
    sbno: 'stopped',
    closed: 'stopped',
    demolished: 'stopped',
    relocated: 'none',
};

/** The tone of a Status's mark. */
export function statusTone(status: Status): StatusTone {
    return statusTones[status];
}
