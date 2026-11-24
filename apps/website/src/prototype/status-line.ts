// PROTOTYPE (issue #41): the status line shared by the Preview Card and the Park page hero.
import { partialDateName } from '@/lib/partial-date';
import { statusName } from '@/lib/status';
import type { StatusEntry } from './data';

const FINAL = new Set(['closed', 'demolished', 'relocated']);
const GAP = new Set(['closed', 'sbno']);

// Partial Dates are never padded. See ADR 0010
const date = (began: string | null) => (began ? partialDateName(began) : null);
const join = (...parts: Array<string | null | false>) => parts.filter(Boolean).join(' ');

/** One line summing up a Status History, or null when there is none. */
export function statusLine(history: Array<StatusEntry>): string | null {
    const current = history.at(-1);
    if (!current) {
        return null;
    }
    const firstOperating = history.find(entry => entry.status === 'operating');
    const opened = firstOperating ? date(firstOperating.began) : null;
    const openedPart = opened ? `opened ${opened}` : null;
    const since = date(current.began);

    if (!firstOperating) {
        return join(statusName(current.status), since && `since ${since}`);
    }
    if (current.status === 'operating') {
        const firstIndex = history.indexOf(firstOperating);
        const hadGap = history.slice(firstIndex, -1).some(entry => GAP.has(entry.status));
        if (hadGap) {
            return [join('Reopened', since), opened && `originally opened ${opened}`].filter(Boolean).join(', ');
        }
        return join('Operating', opened && `since ${opened}`);
    }
    if (FINAL.has(current.status)) {
        return [join(statusName(current.status), since), openedPart].filter(Boolean).join(', ');
    }
    return [join(statusName(current.status), since && `since ${since}`), openedPart].filter(Boolean).join(', ');
}

export const currentStatus = (history: Array<StatusEntry>) => history.at(-1)?.status;
