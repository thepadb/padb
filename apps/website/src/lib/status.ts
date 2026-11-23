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
