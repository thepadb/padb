// PROTOTYPE (issue #41): small pieces every design uses. Layout stays in each design.
import type { Status } from '@padb/api-client';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { partialDateName } from '@/lib/partial-date';
import { statusName } from '@/lib/status';
import { cn } from '@/lib/utils';
import { countryName, type NameEntry, type Park, parks, type StatusEntry } from './data';

export function PartialDate({ value }: { value: string | null }) {
    // Never padded. See ADR 0010
    return value ? (
        <time dateTime={value} className="tabular">
            {partialDateName(value)}
        </time>
    ) : (
        <span className="text-muted-foreground italic">Unknown</span>
    );
}

const table = [
    'w-full border-collapse text-sm tabular [&_td]:py-1.5 [&_td]:pr-4 [&_th]:pb-1.5 [&_th]:pr-4 [&_th]:text-left [&_th]:font-normal [&_th]:text-muted-foreground',
    // A: rows ruled like a timetable
    '[&_tbody_tr]:border-t',
    // B: a register's banded rows under a tinted head
    'design-b:[&_tbody_tr]:border-0 design-b:[&_tbody_tr:nth-child(even)]:bg-muted design-b:[&_thead]:bg-secondary design-b:[&_th]:py-1.5 design-b:[&_th]:pl-3 design-b:[&_td]:pl-3 design-b:[&_th]:font-medium design-b:[&_th]:text-secondary-foreground',
    // C: big bold rows
    'design-c:text-base design-c:[&_tbody_tr]:border-t-2 design-c:[&_tbody_tr]:border-dashed design-c:[&_th]:font-bold design-c:[&_td]:py-2',
].join(' ');

function Empty({ children }: { children: string }) {
    return <p className="text-sm text-muted-foreground italic">{children}</p>;
}

export function StatusTable({ rows, className }: { rows: Array<StatusEntry>; className?: string }) {
    if (rows.length === 0) return <Empty>No Status History yet.</Empty>;
    return (
        <table className={cn(table, className)}>
            <thead>
                <tr>
                    <th>Status</th>
                    <th>From</th>
                </tr>
            </thead>
            <tbody>
                {/* In the order saved, not sorted by date. See ADR 0010 */}
                {rows.map((row, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: entries have no IDs and a Status can recur
                    <tr key={i}>
                        <td>
                            <span className="inline-flex items-center gap-2">
                                <StatusDot status={row.status} />
                                {statusName(row.status)}
                            </span>
                        </td>
                        <td>
                            <PartialDate value={row.began} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export function NameTable({ rows, className }: { rows: Array<NameEntry>; className?: string }) {
    if (rows.length === 0) return <Empty>No Name History yet.</Empty>;
    return (
        <table className={cn(table, className)}>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>First used</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: entries have no IDs and a name can recur
                    <tr key={i}>
                        <td>{row.name}</td>
                        <td>
                            <PartialDate value={row.first_used} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

const TONES: Record<Status, string> = {
    announced: 'bg-st-none',
    under_construction: 'bg-st-pause',
    operating: 'bg-st-ok',
    refurbishing: 'bg-st-pause',
    sbno: 'bg-st-stop',
    closed: 'bg-st-stop',
    demolished: 'bg-st-stop',
    relocated: 'bg-st-none',
};

/** Colour carries the Status; the name always sits beside it. */
export function StatusDot({ status, className }: { status: Status | undefined; className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'inline-block size-2.5 shrink-0 rounded-full',
                status ? TONES[status] : 'bg-st-none',
                className,
            )}
        />
    );
}

export const toneOf = (status: Status | undefined) => (status ? TONES[status] : 'bg-st-none');

export const PAGE_SIZE = 8;

export const openedOf = (history: Array<StatusEntry>) =>
    history.find(entry => entry.status === 'operating')?.began ?? null;

export type SortKey = 'name' | 'country' | 'status' | 'opened';

/** Country filter from ?country=; name filter, sort and "Load more" in memory. */
export function useParksList() {
    const { country } = useSearch({ strict: false }) as { country?: string };
    const navigate = useNavigate();
    const [shown, setShown] = useState(PAGE_SIZE);
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<{ key: SortKey; descending: boolean }>({ key: 'name', descending: false });
    const needle = query.trim().toLocaleLowerCase('en-GB');
    const value = (park: Park): string => {
        if (sort.key === 'country') return countryName(park.country);
        if (sort.key === 'status') return park.statusHistory.at(-1)?.status ?? '~';
        // Partial Dates compare as text only for sorting a prototype list
        if (sort.key === 'opened') return openedOf(park.statusHistory) ?? '~';
        return park.name;
    };
    const filtered = parks
        .filter(park => !country || park.country === country)
        .filter(park => !needle || park.name.toLocaleLowerCase('en-GB').includes(needle))
        .sort((a, b) => value(a).localeCompare(value(b), 'en-GB') * (sort.descending ? -1 : 1));
    const counts = Object.entries(
        parks.reduce<Record<string, number>>((acc, park) => {
            acc[park.country] = (acc[park.country] ?? 0) + 1;
            return acc;
        }, {}),
    )
        .map(([code, count]) => ({ code, name: countryName(code), count }))
        .sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));
    return {
        parks: filtered.slice(0, shown),
        total: filtered.length,
        hasMore: shown < filtered.length,
        loadMore: () => setShown(n => n + PAGE_SIZE),
        countries: counts,
        country,
        setCountry: (code: string | undefined) => {
            setShown(PAGE_SIZE);
            navigate({ to: '.', search: (prev: Record<string, unknown>) => ({ ...prev, country: code }) });
        },
        query,
        setQuery: (next: string) => {
            setShown(PAGE_SIZE);
            setQuery(next);
        },
        sort,
        sortBy: (key: SortKey) => setSort(prev => ({ key, descending: prev.key === key ? !prev.descending : false })),
    };
}

export type ParksList = ReturnType<typeof useParksList>;
