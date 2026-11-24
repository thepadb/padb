// PROTOTYPE (issue #41): design E, "Chronicle". Time is the layout: every Park, Ride and Resort leads
// with a lifeline drawn from its Status History, and the Parks list runs in order of opening.
import type { Status } from '@padb/api-client';
import { Link } from '@tanstack/react-router';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { partialDateName } from '@/lib/partial-date';
import { statusName } from '@/lib/status';
import { cn } from '@/lib/utils';
import {
    countryName,
    findPark,
    findResort,
    type NameEntry,
    type Park,
    type Resort,
    type Ride,
    ridesIn,
    type StatusEntry,
} from '../data';
import { Placeholder } from '../placeholder';
import { PreviewLink } from '../preview-link';
import { SampleForm, useSampleForm } from '../sample-form';
import {
    NameTable,
    openedOf,
    PartialDate,
    type ParksList,
    StatusDot,
    StatusTable,
    toneOf,
    useParksList,
} from '../shared';
import { currentStatus, statusLine } from '../status-line';

const wrap = 'mx-auto w-full max-w-6xl px-5 sm:px-8';
const wide = '[font-stretch:125%]';
const narrow = '[font-stretch:75%]';
const link = 'underline decoration-1 underline-offset-[3px] hover:decoration-2 hover:text-primary';
const h2 = cn('mb-4 text-sm font-semibold text-muted-foreground', narrow);

const today = new Date();
const NOW = today.getFullYear() + today.getMonth() / 12;
const FINAL = new Set<Status>(['closed', 'demolished', 'relocated']);

/** Where a Partial Date sits on the axis. Only for drawing; the text is never padded. See ADR 0010 */
const at = (date: string) => {
    const [year, month] = date.split('-');
    return Number(year) + (month ? (Number(month) - 1) / 12 : 0);
};

const datedYears = (history: Array<StatusEntry>, names: Array<NameEntry> = []) =>
    [...history.map(entry => entry.began), ...names.map(entry => entry.first_used)]
        .filter((date): date is string => Boolean(date))
        .map(at);

function Axis({ start, end }: { start: number; end: number }) {
    const span = end - start;
    const step = span <= 12 ? 2 : span <= 30 ? 5 : span <= 80 ? 10 : 20;
    const ticks: Array<number> = [];
    for (let year = Math.ceil(start / step) * step; year < end - step / 3; year += step) ticks.push(year);
    const left = (year: number) => `${((year - start) / span) * 100}%`;
    return (
        <div aria-hidden="true" className={cn('relative mt-1 h-5 text-xs text-muted-foreground tabular', narrow)}>
            {ticks.map(year => (
                <span
                    key={year}
                    className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                    style={{ left: left(year) }}
                >
                    <span className="block h-1.5 border-l border-muted-foreground/50" />
                    {year}
                </span>
            ))}
            <span className="absolute top-0 right-0 pt-2.5 font-semibold text-foreground">Now</span>
        </div>
    );
}

/** A Status History drawn as one bar, Name History ticked above it. Entries are drawn in the order saved. */
function Lifeline({
    history,
    names = [],
    range,
    compact = false,
}: {
    history: Array<StatusEntry>;
    names?: Array<NameEntry>;
    range?: { start: number; end: number };
    compact?: boolean;
}) {
    const dated = history.filter((entry): entry is { status: Status; began: string } => Boolean(entry.began));
    const undated = history.filter(entry => !entry.began);
    const years = datedYears(history, names);
    if (dated.length === 0) {
        if (compact) return <div aria-hidden="true" className="h-4 bg-muted" />;
        return (
            <p className="text-sm text-muted-foreground italic">
                {history.length ? 'No dated Status History to draw yet.' : 'No Status History yet.'}
            </p>
        );
    }
    const start = range?.start ?? Math.floor(Math.min(...years)) - 1;
    const end = range?.end ?? NOW;
    const span = Math.max(end - start, 1);
    const pos = (value: number) => ((value - start) / span) * 100;
    const namedTicks = names
        .slice(1)
        .filter((entry): entry is NameEntry & { first_used: string } => Boolean(entry.first_used));
    return (
        <div>
            {!compact && namedTicks.length > 0 && (
                <div aria-hidden="true" className="relative mb-1 h-10 text-xs">
                    {namedTicks.map((entry, i) => (
                        <span
                            key={`${entry.name}-${entry.first_used}`}
                            className={cn(
                                'absolute bottom-0 max-w-48 truncate border-l-2 border-foreground pb-0.5 pl-1.5',
                                i % 2 ? 'h-10' : 'h-5',
                            )}
                            style={{ left: `${pos(at(entry.first_used))}%` }}
                            title={`Named ${entry.name} from ${partialDateName(entry.first_used)}`}
                        >
                            {entry.name}
                        </span>
                    ))}
                </div>
            )}
            <div aria-hidden="true" className={cn('relative overflow-hidden bg-muted', compact ? 'h-4' : 'h-10')}>
                {dated.map((entry, i) => {
                    const from = at(entry.began);
                    const next = dated[i + 1];
                    const to = next ? at(next.began) : end;
                    const last = !next;
                    return (
                        <span
                            // biome-ignore lint/suspicious/noArrayIndexKey: entries have no IDs and a Status can recur
                            key={i}
                            title={`${statusName(entry.status)} from ${partialDateName(entry.began)}`}
                            className={cn(
                                'absolute inset-y-0 flex items-center overflow-hidden border-l-2 border-background px-1.5 text-xs font-semibold whitespace-nowrap text-white [text-shadow:0_1px_2px_rgb(0_0_0/.4)]',
                                toneOf(entry.status),
                                last && FINAL.has(entry.status) && 'opacity-40',
                                narrow,
                            )}
                            style={{ left: `${pos(from)}%`, width: `${Math.max(pos(to) - pos(from), 0.6)}%` }}
                        >
                            {!compact && statusName(entry.status)}
                        </span>
                    );
                })}
            </div>
            {!compact && <Axis start={start} end={end} />}
            {!compact && undated.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                    Not drawn, no date: {undated.map(entry => statusName(entry.status)).join(', ')}
                </p>
            )}
        </div>
    );
}

export function Header() {
    return (
        <header className="border-b-2 border-foreground">
            <div className={cn(wrap, 'flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 py-4')}>
                <Link to="/" className={cn('text-lg font-extrabold tracking-tight', wide)}>
                    Parks &amp; Attractions Database
                </Link>
                <nav className="flex gap-5 text-sm font-medium [&_a.active]:text-primary [&_a:hover]:underline">
                    <Link to="/parks">Parks by year</Link>
                    <Link to="/resorts/$resort" params={{ resort: 'lakeside' }}>
                        Resorts
                    </Link>
                    <Link to="/parks/new">Add a Park</Link>
                </nav>
            </div>
        </header>
    );
}

function Title({ name, line, context }: { name: string; line?: string | null; context?: React.ReactNode }) {
    return (
        <div className="pt-10 pb-8">
            {context && <p className="mb-3 text-sm text-muted-foreground">{context}</p>}
            <h1
                className={cn(
                    'text-4xl leading-[1.02] font-extrabold tracking-tight text-balance break-words hyphens-auto sm:text-6xl',
                    wide,
                )}
            >
                {name}
            </h1>
            {line && <p className="mt-4 text-lg">{line}</p>}
        </div>
    );
}

function Facts({ name, rows }: { name: string; rows: Array<[string, React.ReactNode]> }) {
    return (
        <aside>
            <Placeholder name={name} className="aspect-[3/2] w-full" />
            <dl className="mt-5 grid grid-cols-[minmax(0,7rem)_1fr] gap-x-4 gap-y-2 text-sm">
                {rows.map(([label, value]) => (
                    <div key={label} className="contents">
                        <dt className={cn('text-muted-foreground', narrow)}>{label}</dt>
                        <dd className="break-words">{value}</dd>
                    </div>
                ))}
            </dl>
        </aside>
    );
}

function Histories({ status, names }: { status: Array<StatusEntry>; names: Array<NameEntry> }) {
    return (
        <section className="grid gap-8 sm:grid-cols-2">
            <div>
                <h2 className={h2}>Status History</h2>
                <StatusTable rows={status} />
            </div>
            <div>
                <h2 className={h2}>Name History</h2>
                <NameTable rows={names} />
            </div>
        </section>
    );
}

function Body({ facts, children }: { facts: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="grid gap-10 border-t pt-10 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-14">
            {facts}
            <div className="min-w-0 space-y-12">{children}</div>
        </div>
    );
}

const year = (date: string | null) => (date ? date.slice(0, 4) : null);

export function ParkPage({ park }: { park: Park }) {
    const resort = park.resort ? findResort(park.resort) : undefined;
    const status = currentStatus(park.statusHistory);
    // A sequence, so ordered by opening; undated Rides last
    const rides = ridesIn(park.id).sort((a, b) =>
        (openedOf(a.statusHistory) ?? '~').localeCompare(openedOf(b.statusHistory) ?? '~'),
    );
    return (
        <main className={wrap}>
            <Title
                name={park.name}
                line={statusLine(park.statusHistory)}
                context={
                    <>
                        {countryName(park.country)}
                        {resort && (
                            <>
                                , part of{' '}
                                <PreviewLink kind="resort" id={resort.id} className={link}>
                                    {resort.name}
                                </PreviewLink>
                            </>
                        )}
                    </>
                }
            />
            <section className="pb-10">
                <Lifeline history={park.statusHistory} names={park.nameHistory} />
            </section>
            <Body
                facts={
                    <Facts
                        name={park.name}
                        rows={[
                            ['Status', status ? statusName(status) : 'Not recorded'],
                            ['Opened', <PartialDate key="o" value={openedOf(park.statusHistory)} />],
                            ['Operator', park.operator],
                            ['Country', countryName(park.country)],
                            [
                                'Website',
                                park.website ? (
                                    <a key="w" className={link} href={park.website}>
                                        {new URL(park.website).host}
                                    </a>
                                ) : (
                                    'None'
                                ),
                            ],
                        ]}
                    />
                }
            >
                <section>
                    <h2 className={h2}>Rides, in order of opening</h2>
                    {rides.length ? (
                        <ol className="border-t">
                            {rides.map(ride => (
                                <li
                                    key={ride.id}
                                    className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-baseline gap-x-4 border-b py-2.5"
                                >
                                    <span className={cn('text-lg font-bold tabular', wide)}>
                                        {year(openedOf(ride.statusHistory)) ?? '?'}
                                    </span>
                                    <PreviewLink kind="ride" id={ride.id} className={cn(link, 'font-semibold')}>
                                        {ride.name}
                                    </PreviewLink>
                                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                        <StatusDot status={currentStatus(ride.statusHistory)} />
                                        {statusName(currentStatus(ride.statusHistory) ?? 'operating')}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">No Rides recorded yet.</p>
                    )}
                </section>
                <section>
                    <h2 className={h2}>Areas</h2>
                    {park.areas.length ? (
                        <p className="max-w-[70ch] text-lg leading-relaxed">
                            {park.areas.map((area, i) => (
                                <span key={area}>
                                    {area}
                                    {i < park.areas.length - 1 && <span className="text-muted-foreground">, </span>}
                                </span>
                            ))}
                        </p>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">No Areas recorded yet.</p>
                    )}
                </section>
                <Histories status={park.statusHistory} names={park.nameHistory} />
            </Body>
        </main>
    );
}

/** Groups Parks by the decade they first opened; Parks without a date sit apart. */
function groupByDecade(parks: Array<Park>) {
    const groups = new Map<string, Array<Park>>();
    for (const park of parks) {
        const opened = openedOf(park.statusHistory);
        const operated = park.statusHistory.some(entry => entry.status === 'operating');
        const key = opened ? `${opened.slice(0, 3)}0s` : operated ? 'Opening date unknown' : 'Not opened';
        groups.set(key, [...(groups.get(key) ?? []), park]);
    }
    return [...groups.entries()];
}

function CountryFilter({ list }: { list: ParksList }) {
    const item = (active: boolean) =>
        cn(
            'flex w-full justify-between gap-3 border-l-2 border-transparent py-1 pl-3 text-left text-sm hover:border-muted-foreground',
            active && 'border-primary font-semibold text-primary hover:border-primary',
        );
    return (
        <fieldset>
            <legend className={h2}>Country</legend>
            <ul>
                <li>
                    <button type="button" className={item(!list.country)} onClick={() => list.setCountry(undefined)}>
                        Everywhere
                    </button>
                </li>
                {list.countries.map(country => (
                    <li key={country.code}>
                        <button
                            type="button"
                            className={item(list.country === country.code)}
                            aria-pressed={list.country === country.code}
                            onClick={() => list.setCountry(country.code)}
                        >
                            {country.name}
                            <span className="text-muted-foreground tabular">{country.count}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </fieldset>
    );
}

export function ParksPage() {
    const list = useParksList({ key: 'opened', descending: false });
    return (
        <main className={wrap}>
            <Title
                name="Parks by year opened"
                line={`${list.total} ${list.total === 1 ? 'Park' : 'Parks'}${list.country ? ` in ${countryName(list.country)}` : ''}, oldest first`}
            />
            <div className="grid gap-10 border-t pt-8 lg:grid-cols-[12rem_minmax(0,1fr)]">
                <aside className="hidden lg:block">
                    <CountryFilter list={list} />
                </aside>
                <div className="min-w-0">
                    <div className="mb-6 lg:hidden">
                        <Sheet
                            title="Filter Parks"
                            trigger={
                                <Button variant="outline">
                                    Country: {list.country ? countryName(list.country) : 'Everywhere'}
                                </Button>
                            }
                        >
                            <CountryFilter list={list} />
                        </Sheet>
                    </div>
                    <ol>
                        {groupByDecade(list.parks).map(([decade, parks]) => (
                            <li
                                key={decade}
                                className="grid gap-x-8 gap-y-3 border-l-2 border-foreground pb-10 pl-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:border-l-0 sm:pl-0"
                            >
                                <h2
                                    className={cn(
                                        'text-3xl leading-none font-extrabold tabular sm:sticky sm:top-4 sm:h-fit sm:border-t-2 sm:border-foreground sm:pt-2',
                                        wide,
                                        !/^\d/.test(decade) && 'text-base leading-tight font-bold',
                                    )}
                                >
                                    {decade}
                                </h2>
                                <ul className="grid grid-cols-2 gap-x-4 gap-y-7 xl:grid-cols-3">
                                    {parks.map(park => (
                                        <li key={park.id} className="min-w-0">
                                            <Link to="/parks/$park" params={{ park: park.id }} className="group block">
                                                <Placeholder name={park.name} className="aspect-[3/2] w-full" />
                                                <Lifeline
                                                    history={park.statusHistory}
                                                    range={{ start: 1950, end: NOW }}
                                                    compact
                                                />
                                                <p className="mt-2 font-semibold leading-snug break-words group-hover:underline">
                                                    {park.name}
                                                </p>
                                            </Link>
                                            <p className="mt-0.5 text-sm text-muted-foreground">
                                                {countryName(park.country)}
                                                <br />
                                                {statusLine(park.statusHistory) ?? 'No Status History yet'}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ol>
                    {list.hasMore && (
                        <div className="flex items-center gap-4 border-t-2 border-foreground pt-4 text-sm">
                            <Button onClick={list.loadMore}>Load more</Button>
                            <span className="text-muted-foreground">
                                {list.parks.length} of {list.total} shown
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

export function RidePage({ ride }: { ride: Ride }) {
    const park = findPark(ride.park);
    const years = [
        ...datedYears(ride.statusHistory, ride.nameHistory),
        ...(park ? datedYears(park.statusHistory) : []),
    ];
    const range = years.length ? { start: Math.floor(Math.min(...years)) - 1, end: NOW } : undefined;
    return (
        <main className={wrap}>
            <Title
                name={ride.name}
                line={statusLine(ride.statusHistory)}
                context={
                    park && (
                        <>
                            {ride.category} at{' '}
                            <PreviewLink kind="park" id={park.id} className={link}>
                                {park.name}
                            </PreviewLink>
                        </>
                    )
                }
            />
            <section className="pb-10">
                {/* Drawn against its Park's lifetime, so the Ride sits in context */}
                {park && (
                    <div className="mb-2">
                        <p className={cn('mb-1 text-xs text-muted-foreground', narrow)}>{park.name}</p>
                        <Lifeline history={park.statusHistory} range={range} compact />
                    </div>
                )}
                <Lifeline history={ride.statusHistory} names={ride.nameHistory} range={range} />
            </section>
            <Body
                facts={
                    <Facts
                        name={ride.name}
                        rows={[
                            ['Area', ride.area ?? 'Not recorded'],
                            ['Category', ride.category],
                            ['Manufacturer', ride.manufacturer],
                            ['Ride Model', ride.model ?? 'None'],
                            ['Height', ride.heightM ? `${ride.heightM} m` : 'Not recorded'],
                            ['Top speed', ride.speedKmh ? `${ride.speedKmh} km/h` : 'Not recorded'],
                            ['Opened', <PartialDate key="o" value={openedOf(ride.statusHistory)} />],
                        ]}
                    />
                }
            >
                <Histories status={ride.statusHistory} names={ride.nameHistory} />
            </Body>
        </main>
    );
}

export function ResortPage({ resort }: { resort: Resort }) {
    const members = resort.parks.map(findPark).filter((park): park is Park => Boolean(park));
    const years = [
        ...members.flatMap(park => datedYears(park.statusHistory)),
        ...resort.hotels.flatMap(hotel => (hotel.opened ? [at(hotel.opened)] : [])),
    ];
    const range = { start: Math.floor(Math.min(...years)) - 1, end: NOW };
    const pos = (value: number) => `${((value - range.start) / (range.end - range.start)) * 100}%`;
    return (
        <main className={wrap}>
            <Title name={resort.name} context={`${countryName(resort.country)}, run by ${resort.operator}`} />
            {/* One shared axis: every Park and Hotel on the same clock */}
            <section className="pb-10">
                <ul className="space-y-4">
                    {members.map(park => (
                        <li key={park.id}>
                            <PreviewLink
                                kind="park"
                                id={park.id}
                                className={cn(link, 'mb-1 inline-block font-semibold')}
                            >
                                {park.name}
                            </PreviewLink>
                            <Lifeline history={park.statusHistory} range={range} compact />
                        </li>
                    ))}
                    <li>
                        <p className="mb-1 font-semibold">Hotels</p>
                        <div className="relative h-4 bg-muted" aria-hidden="true">
                            {resort.hotels
                                .filter(hotel => hotel.opened)
                                .map(hotel => (
                                    <span
                                        key={hotel.name}
                                        title={hotel.name}
                                        className="absolute top-0 h-4 w-1 bg-foreground"
                                        style={{ left: pos(at(hotel.opened as string)) }}
                                    />
                                ))}
                        </div>
                    </li>
                </ul>
                <Axis start={range.start} end={range.end} />
            </section>
            <Body
                facts={
                    <Facts
                        name={resort.name}
                        rows={[
                            ['Country', countryName(resort.country)],
                            ['Operator', resort.operator],
                            ['Parks', members.length],
                            ['Hotels', resort.hotels.length],
                        ]}
                    />
                }
            >
                <section>
                    <h2 className={h2}>Hotels, in order of opening</h2>
                    <ol className="border-t">
                        {[...resort.hotels]
                            .sort((a, b) => (a.opened ?? '~').localeCompare(b.opened ?? '~'))
                            .map(hotel => (
                                <li
                                    key={hotel.name}
                                    className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-x-4 border-b py-2.5"
                                >
                                    <span className={cn('text-lg font-bold tabular', wide)}>
                                        {year(hotel.opened) ?? '?'}
                                    </span>
                                    {hotel.name}
                                </li>
                            ))}
                    </ol>
                </section>
                <section>
                    <h2 className={h2}>Name History</h2>
                    <NameTable rows={resort.nameHistory} className="max-w-md" />
                </section>
            </Body>
        </main>
    );
}

export function FormPage() {
    const state = useSampleForm();
    return (
        <main className={cn(wrap, 'max-w-3xl')}>
            <Title name="Add a Park" line="Start with its first Status. You can add the rest of its history after." />
            <SampleForm
                state={state}
                className="border-t-2 border-foreground pt-8"
                actions={
                    <div className="flex flex-wrap gap-3 pt-2">
                        <Button type="submit">Add Park</Button>
                        <Button type="button" variant="outline" onClick={state.showErrors}>
                            Show error states
                        </Button>
                    </div>
                }
            />
        </main>
    );
}

export function Footer({ children }: { children: React.ReactNode }) {
    return (
        <footer className="mt-20 border-t-2 border-foreground">
            <div className={cn(wrap, 'flex flex-wrap justify-between gap-4 py-6 text-sm text-muted-foreground')}>
                <span>Data under ODbL 1.0, code under AGPL-3.0.</span>
                {children}
            </div>
        </footer>
    );
}
