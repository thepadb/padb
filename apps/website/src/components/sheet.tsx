// The building blocks of a record's sheet: breadcrumbs, photo placeholder, sections, facts and
// compact tables. See docs/agents/design.md
import type { Status } from '@padb/api-client';
import { cn } from 'cn';
import { ChevronRightIcon } from 'lucide-react';
import type * as React from 'react';
import { partialDateName } from '@/lib/partial-date';
import { initials, placeholderHue } from '@/lib/placeholder';
import { type StatusTone, statusName, statusTone } from '@/lib/status';
import { compactText, quietNote, sectionHeading } from './text';

/** The trail from a top-level page to this one; the last item is the page itself. */
export function Breadcrumbs({ children, className }: { children: Array<React.ReactNode>; className?: string }) {
    return (
        <nav aria-label="Breadcrumb" className={cn('text-sm text-muted-foreground', className)}>
            <ol className="flex flex-wrap items-center gap-1">
                {children.map((item, position) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: a fixed trail
                    <li key={position} className="flex items-center gap-1">
                        {position > 0 && <ChevronRightIcon aria-hidden="true" className="size-3.5" />}
                        {position === children.length - 1 ? <span aria-current="page">{item}</span> : item}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

/** A tinted block with a name's initials, in the slot a photo will take. Give it the photo's aspect ratio. */
export function Placeholder({ name, className }: { name: string; className?: string }) {
    return (
        <div
            // Decorative until there is a photo
            aria-hidden="true"
            className={cn(
                'flex items-center [container-type:size] justify-center overflow-hidden bg-placeholder font-bold text-placeholder-foreground select-none',
                className,
            )}
            style={{ '--placeholder-hue': placeholderHue(name) } as React.CSSProperties}
        >
            <span className="text-[clamp(0.75rem,28cqh,7rem)] leading-none tracking-tight">{initials(name)}</span>
        </div>
    );
}

/** A titled part of a sheet, ruled off from the one above. The count, when given, follows the title. */
export function Section({
    title,
    count,
    className,
    children,
}: {
    title: string;
    count?: number;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <section className={cn('border-t pt-4 pb-8', className)}>
            <h2 className={cn(sectionHeading, 'mb-3')}>
                {title}
                {count ? <span className="ml-1.5 font-normal text-muted-foreground">{count}</span> : null}
            </h2>
            {children}
        </section>
    );
}

/** Labelled facts, one per row. */
export function Facts({ facts }: { facts: Array<{ label: string; value: React.ReactNode }> }) {
    return (
        <dl>
            {facts.map(fact => (
                <div
                    key={fact.label}
                    className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 border-b py-2 text-sm last:border-0 sm:grid-cols-[10rem_minmax(0,1fr)]"
                >
                    <dt className="text-muted-foreground">{fact.label}</dt>
                    <dd className="min-w-0 break-words">{fact.value}</dd>
                </div>
            ))}
        </dl>
    );
}

const dataTable = cn(
    compactText,
    'w-full tabular-nums [&_td]:border-t [&_td]:py-1 [&_td]:pr-4 [&_th]:pb-1.5 [&_th]:pr-4 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground',
);

/**
 * A Status History or Name History as a compact table: what, then the Partial Date it began, in the order
 * saved, not sorted by date. See ADR 0010
 */
export function HistoryTable({
    headings,
    rows,
    empty,
}: {
    headings: [what: string, when: string];
    rows: Array<[what: React.ReactNode, when: string | null]>;
    empty: string;
}) {
    if (rows.length === 0) {
        return <EmptyNote>{empty}</EmptyNote>;
    }
    return (
        <table className={dataTable}>
            <thead>
                <tr>
                    <th>{headings[0]}</th>
                    <th>{headings[1]}</th>
                </tr>
            </thead>
            <tbody>
                {rows.map(([what, when], position) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: entries have no IDs and can recur
                    <tr key={position}>
                        <td>{what}</td>
                        <td>
                            <PartialDate value={when} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/** A quiet note standing in for a section with nothing in it. */
export function EmptyNote({ children }: { children: string }) {
    return <p className={quietNote}>{children}</p>;
}

/** A Partial Date at its own precision, never padded, or "Unknown". See ADR 0010 */
export function PartialDate({ value }: { value: string | null }) {
    return value ? (
        <time dateTime={value}>{partialDateName(value)}</time>
    ) : (
        <span className="text-muted-foreground italic">Unknown</span>
    );
}

const toneClasses: Record<StatusTone, string> = {
    operating: 'bg-status-operating',
    paused: 'bg-status-paused',
    stopped: 'bg-status-stopped',
    none: 'bg-status-none',
};

/** A Status's name with its coloured dot; the name carries the meaning, never the colour alone. */
export function StatusName({ status }: { status: Status }) {
    return (
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', toneClasses[statusTone(status)])} />
            {statusName(status)}
        </span>
    );
}
