import type { Status, StatusHistoryEntry } from '@padb/api-client';
import { partialDateName } from './partial-date';

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

// Statuses a Park doesn't come back from, shown without "since"
const finalStatuses: ReadonlySet<Status> = new Set(['closed', 'demolished', 'relocated']);

/** The parts that are present, joined with `separator`. */
function joinPresent(separator: string, ...parts: Array<string | null>): string {
    return parts.filter(part => part !== null).join(separator);
}

/** A Partial Date after its prefix, or null when it is unknown. Never padded. See ADR 0010 */
function datePart(began: string | null, prefix?: string): string | null {
    return began ? joinPresent(' ', prefix ?? null, partialDateName(began)) : null;
}

/**
 * Whether it was closed in effect at any point after it first operated: any Status but operating, since nobody
 * could ride or visit, whatever the reason.
 */
function everClosed(history: Array<StatusHistoryEntry>): boolean {
    const firstOperating = history.findIndex(entry => entry.status === 'operating');
    return history.slice(firstOperating + 1).some(entry => entry.status !== 'operating');
}

/**
 * What a Status History says now and since when, e.g. "Reopened 2005, originally opened 1971", or null when it
 * is empty. Entries are read in the order saved, the last one current. See docs/agents/design.md
 */
export function statusLine(history: Array<StatusHistoryEntry>): string | null {
    const current = history.at(-1);
    if (!current) {
        return null;
    }
    const opened = history.find(entry => entry.status === 'operating')?.began ?? null;
    if (current.status === 'operating') {
        if (!everClosed(history)) {
            return joinPresent(' ', statusName('operating'), datePart(opened, 'since'));
        }
        return joinPresent(
            ', ',
            joinPresent(' ', 'Reopened', datePart(current.began)),
            datePart(opened, 'originally opened'),
        );
    }
    const now = joinPresent(
        ' ',
        statusName(current.status),
        datePart(current.began, finalStatuses.has(current.status) ? undefined : 'since'),
    );
    return joinPresent(', ', now, datePart(opened, 'opened'));
}
