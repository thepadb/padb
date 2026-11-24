// PROTOTYPE (issue #41): small pieces every design uses. Layout stays in each design.
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { partialDateName } from '@/lib/partial-date';
import { statusName } from '@/lib/status';
import { cn } from '@/lib/utils';
import { countryName, type NameEntry, parks, type StatusEntry } from './data';

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

const table =
    'w-full border-collapse text-sm [&_td]:py-1.5 [&_td]:pr-4 [&_th]:py-1.5 [&_th]:pr-4 [&_th]:text-left [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr]:border-t '
    + 'design-b:text-[0.9rem] design-b:[&_th]:font-mono design-b:[&_th]:text-[0.68rem] design-b:[&_th]:uppercase design-b:[&_th]:tracking-widest design-b:[&_td]:py-1 design-b:[&_thead_tr]:border-b design-b:[&_thead_tr]:border-foreground '
    + 'design-c:[&_tbody_tr:nth-child(odd)]:bg-muted design-c:[&_tbody_tr]:border-0 design-c:[&_td:first-child]:pl-3 design-c:[&_th:first-child]:pl-3 design-c:[&_th]:font-display';

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
                        <td>{statusName(row.status)}</td>
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

export const PAGE_SIZE = 8;

/** Country filter from ?country=, "Load more" in memory. */
export function useParksList() {
    const { country } = useSearch({ strict: false }) as { country?: string };
    const navigate = useNavigate();
    const [shown, setShown] = useState(PAGE_SIZE);
    const filtered = country ? parks.filter(park => park.country === country) : parks;
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
    };
}

export type ParksList = ReturnType<typeof useParksList>;
