// PROTOTYPE (issue #41): design A, "Wayfinding". Minimal: signage type, no boxes, colour only for Status.
// The one bold element is Status History drawn as a transit line.
import { Link } from '@tanstack/react-router';
import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { statusName } from '@/lib/status';
import { cn } from '@/lib/utils';
import {
    countryName,
    findPark,
    findResort,
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
import { partialDateName } from '@/lib/partial-date';

const wrap = 'mx-auto w-full max-w-6xl px-5 sm:px-8';
const h2 = 'mb-4 text-lg font-bold';

export function Header() {
    return (
        <header className="border-b">
            <div className={cn(wrap, 'flex h-16 items-center justify-between gap-6')}>
                <Link to="/" className="flex items-center gap-2.5 font-bold">
                    <span className="grid size-7 place-items-center rounded-sm bg-foreground text-sm text-background">
                        P
                    </span>
                    <span className="hidden sm:inline">Parks &amp; Attractions Database</span>
                </Link>
                <nav className="flex gap-6 text-sm text-muted-foreground [&_a.active]:text-foreground [&_a:hover]:text-foreground">
                    <Link to="/parks">Parks</Link>
                    <Link to="/resorts/$resort" params={{ resort: 'lakeside' }}>
                        Resorts
                    </Link>
                    <Link to="/parks/new">Add a Park</Link>
                </nav>
            </div>
        </header>
    );
}

/** Status History as a line with a stop for each Status, coloured by how it ran. */
function StatusLine({ rows }: { rows: Array<StatusEntry> }) {
    if (rows.length === 0) return null;
    return (
        <ol className="-mx-5 flex overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0" aria-label="Status History as a line">
            {rows.map((row, i) => {
                const last = i === rows.length - 1;
                return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: entries have no IDs and a Status can recur
                    <li key={i} className="relative min-w-32 flex-1 pt-7 pr-4">
                        <span
                            aria-hidden="true"
                            className={cn(
                                'absolute top-2 left-0 h-1.5 w-full',
                                toneOf(row.status),
                                last && 'opacity-35',
                            )}
                        />
                        <span
                            aria-hidden="true"
                            className={cn(
                                'absolute top-0 left-0 size-5.5 rounded-full border-[5px] bg-background',
                                toneOf(row.status).replace('bg-', 'border-'),
                            )}
                        />
                        <p className="font-semibold leading-tight">{statusName(row.status)}</p>
                        <p className="text-sm text-muted-foreground tabular">
                            {row.began ? partialDateName(row.began) : 'Date unknown'}
                        </p>
                    </li>
                );
            })}
        </ol>
    );
}

function Title({
    name,
    status,
    line,
    context,
}: {
    name: string;
    status?: StatusEntry['status'];
    line: string | null;
    context: React.ReactNode;
}) {
    return (
        <div className="max-w-4xl pt-12 pb-8">
            <p className="mb-3 text-muted-foreground">{context}</p>
            <h1 className="text-4xl leading-[1.02] font-extrabold tracking-[-0.025em] text-balance break-words hyphens-auto sm:text-6xl">
                {name}
            </h1>
            {line && (
                <p className="mt-5 flex items-center gap-2.5 text-xl">
                    <StatusDot status={status} className="size-3.5" />
                    {line}
                </p>
            )}
        </div>
    );
}

function Facts({ rows }: { rows: Array<[string, React.ReactNode]> }) {
    return (
        <dl className="grid h-fit gap-4 sm:grid-cols-2 lg:sticky lg:top-8 lg:grid-cols-1">
            {rows.map(([label, value]) => (
                <div key={label}>
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="break-words">{value}</dd>
                </div>
            ))}
        </dl>
    );
}

function Body({ facts, children }: { facts: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="grid gap-12 py-12 lg:grid-cols-[13rem_minmax(0,1fr)]">
            {facts}
            <div className="grid min-w-0 gap-14">{children}</div>
        </div>
    );
}

const link = 'underline decoration-1 underline-offset-4 hover:decoration-2';

function RideRows({ rides }: { rides: Array<Ride> }) {
    return (
        <ul className="divide-y border-y">
            {rides.map(ride => (
                <li key={ride.id} className="flex items-baseline justify-between gap-4 py-2.5">
                    <span className="flex min-w-0 items-center gap-2.5">
                        <StatusDot status={currentStatus(ride.statusHistory)} />
                        <PreviewLink kind="ride" id={ride.id} className={link}>
                            {ride.name}
                        </PreviewLink>
                    </span>
                    <span className="shrink-0 text-sm text-muted-foreground">{ride.category}</span>
                </li>
            ))}
        </ul>
    );
}

export function ParkPage({ park }: { park: Park }) {
    const resort = park.resort ? findResort(park.resort) : undefined;
    const rides = ridesIn(park.id);
    return (
        <main className={wrap}>
            <Title
                name={park.name}
                status={currentStatus(park.statusHistory)}
                line={statusLine(park.statusHistory)}
                context={
                    resort ? (
                        <>
                            In{' '}
                            <PreviewLink kind="resort" id={resort.id} className={link}>
                                {resort.name}
                            </PreviewLink>
                            , {countryName(park.country)}
                        </>
                    ) : (
                        countryName(park.country)
                    )
                }
            />
            <Placeholder name={park.name} className="aspect-[21/9] w-full rounded-sm" />
            <Body
                facts={
                    <Facts
                        rows={[
                            ['Country', countryName(park.country)],
                            ...(resort ? [['Resort', resort.name] as [string, string]] : []),
                            ['Operator', park.operator],
                            ['Opened', <PartialDate key="o" value={openedOf(park.statusHistory)} />],
                            ...(park.website
                                ? [
                                      [
                                          'Website',
                                          <a key="w" className={link} href={park.website}>
                                              {new URL(park.website).host}
                                          </a>,
                                      ] as [string, React.ReactNode],
                                  ]
                                : []),
                        ]}
                    />
                }
            >
                <section>
                    <h2 className={h2}>Status History</h2>
                    <StatusLine rows={park.statusHistory} />
                    <StatusTable rows={park.statusHistory} className="mt-6 max-w-md" />
                </section>
                {rides.length > 0 && (
                    <section>
                        <h2 className={h2}>Rides ({rides.length})</h2>
                        <RideRows rides={rides} />
                    </section>
                )}
                <section>
                    <h2 className={h2}>Areas ({park.areas.length})</h2>
                    {park.areas.length === 0 ? (
                        <p className="text-muted-foreground">No Areas yet.</p>
                    ) : (
                        <ul className="columns-2 gap-8 sm:columns-3 [&>li]:py-1">
                            {park.areas.map(area => (
                                <li key={area}>{area}</li>
                            ))}
                        </ul>
                    )}
                </section>
                <section>
                    <h2 className={h2}>Name History</h2>
                    <NameTable rows={park.nameHistory} className="max-w-md" />
                </section>
            </Body>
        </main>
    );
}

function CountryLinks({ list }: { list: ParksList }) {
    const item = (active: boolean) =>
        cn(
            'flex w-full justify-between py-1 text-left text-muted-foreground hover:text-foreground',
            active && 'font-bold text-foreground',
        );
    return (
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
                        onClick={() => list.setCountry(country.code)}
                    >
                        {country.name}
                        <span className="tabular">{country.count}</span>
                    </button>
                </li>
            ))}
        </ul>
    );
}

export function ParksPage() {
    const list = useParksList();
    const search = useRef<HTMLInputElement>(null);
    // `/` jumps to the name filter, as on most search-first sites
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') {
                event.preventDefault();
                search.current?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
    return (
        <main className={wrap}>
            <div className="flex flex-wrap items-end justify-between gap-6 pt-12 pb-10">
                <div>
                    <h1 className="text-5xl font-extrabold tracking-[-0.025em] sm:text-6xl">Parks</h1>
                    <p className="mt-2 text-muted-foreground">
                        {list.total} {list.total === 1 ? 'Park' : 'Parks'}
                        {list.country && ` in ${countryName(list.country)}`}
                    </p>
                </div>
                <label className="relative w-full sm:w-80">
                    <span className="sr-only">Filter Parks by name</span>
                    <input
                        ref={search}
                        value={list.query}
                        onChange={event => list.setQuery(event.target.value)}
                        placeholder="Filter by name"
                        className="h-12 w-full border-0 border-b-2 border-input bg-transparent pr-8 text-lg outline-none placeholder:text-muted-foreground focus:border-foreground"
                    />
                    <kbd className="absolute top-3 right-0 rounded-sm border px-1.5 text-sm text-muted-foreground">
                        /
                    </kbd>
                </label>
            </div>
            <div className="grid gap-12 pb-12 lg:grid-cols-[13rem_minmax(0,1fr)]">
                <aside className="hidden lg:block">
                    <CountryLinks list={list} />
                </aside>
                <div>
                    <div className="mb-6 lg:hidden">
                        <Sheet
                            title="Country"
                            trigger={
                                <Button variant="outline">
                                    {list.country ? countryName(list.country) : 'Everywhere'}
                                </Button>
                            }
                        >
                            <CountryLinks list={list} />
                        </Sheet>
                    </div>
                    {list.parks.length === 0 ? (
                        <p className="text-lg">No Parks match “{list.query}”. Try fewer letters, or another country.</p>
                    ) : (
                        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3">
                            {list.parks.map(park => (
                                <li key={park.id}>
                                    <Link to="/parks/$park" params={{ park: park.id }} className="group block">
                                        <Placeholder name={park.name} className="aspect-[4/3] w-full rounded-sm" />
                                        <p className="mt-3 line-clamp-2 leading-snug font-bold group-hover:underline">
                                            {park.name}
                                        </p>
                                        {statusLine(park.statusHistory) && (
                                            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                                                <StatusDot
                                                    status={currentStatus(park.statusHistory)}
                                                    className="size-2"
                                                />
                                                {statusLine(park.statusHistory)}
                                            </p>
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                    {list.hasMore && (
                        <Button variant="outline" className="mt-12" onClick={list.loadMore}>
                            Load more
                        </Button>
                    )}
                </div>
            </div>
        </main>
    );
}

export function RidePage({ ride }: { ride: Ride }) {
    const park = findPark(ride.park);
    const others = ridesIn(ride.park).filter(other => other.id !== ride.id);
    return (
        <main className={wrap}>
            <Title
                name={ride.name}
                status={currentStatus(ride.statusHistory)}
                line={statusLine(ride.statusHistory)}
                context={
                    park ? (
                        <>
                            {ride.category} at{' '}
                            <PreviewLink kind="park" id={park.id} className={link}>
                                {park.name}
                            </PreviewLink>
                        </>
                    ) : (
                        ride.category
                    )
                }
            />
            <Placeholder name={ride.name} className="aspect-[21/9] w-full rounded-sm" />
            <Body
                facts={
                    <Facts
                        rows={[
                            ['Area', ride.area ?? 'Not recorded'],
                            ['Manufacturer', ride.manufacturer],
                            ['Ride Model', ride.model ?? 'None'],
                            ['Height', ride.heightM ? `${ride.heightM} m` : 'Not recorded'],
                            ['Top speed', ride.speedKmh ? `${ride.speedKmh} km/h` : 'Not recorded'],
                            ['Opened', <PartialDate key="o" value={openedOf(ride.statusHistory)} />],
                        ]}
                    />
                }
            >
                <section>
                    <h2 className={h2}>Status History</h2>
                    <StatusLine rows={ride.statusHistory} />
                    <StatusTable rows={ride.statusHistory} className="mt-6 max-w-md" />
                </section>
                <section>
                    <h2 className={h2}>Name History</h2>
                    <NameTable rows={ride.nameHistory} className="max-w-md" />
                </section>
                {park && others.length > 0 && (
                    <section>
                        <h2 className={h2}>Also at {park.name}</h2>
                        <RideRows rides={others} />
                    </section>
                )}
            </Body>
        </main>
    );
}

export function ResortPage({ resort }: { resort: Resort }) {
    return (
        <main className={wrap}>
            <Title
                name={resort.name}
                line={null}
                context={`Resort in ${countryName(resort.country)} with ${resort.parks.length} ${resort.parks.length === 1 ? 'Park' : 'Parks'} and ${resort.hotels.length} ${resort.hotels.length === 1 ? 'Hotel' : 'Hotels'}`}
            />
            <Placeholder name={resort.name} className="aspect-[21/9] w-full rounded-sm" />
            <Body
                facts={
                    <Facts
                        rows={[
                            ['Country', countryName(resort.country)],
                            ['Operator', resort.operator],
                        ]}
                    />
                }
            >
                <section>
                    <h2 className={h2}>Parks</h2>
                    <ul className="divide-y border-y">
                        {resort.parks.map(id => {
                            const park = findPark(id);
                            return park ? (
                                <li key={id} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2.5">
                                    <span className="flex items-center gap-2.5">
                                        <StatusDot status={currentStatus(park.statusHistory)} />
                                        <PreviewLink kind="park" id={id} className={link}>
                                            {park.name}
                                        </PreviewLink>
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {statusLine(park.statusHistory)}
                                    </span>
                                </li>
                            ) : null;
                        })}
                    </ul>
                </section>
                <section>
                    <h2 className={h2}>Hotels</h2>
                    <ul className="divide-y border-y">
                        {resort.hotels.map(hotel => (
                            <li key={hotel.name} className="flex justify-between gap-4 py-2.5">
                                {hotel.name}
                                <span className="text-sm text-muted-foreground">
                                    {hotel.opened ? (
                                        <>
                                            Opened <PartialDate value={hotel.opened} />
                                        </>
                                    ) : (
                                        'Opening date unknown'
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
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
        <main className={cn(wrap, 'max-w-xl py-12')}>
            <h1 className="text-4xl font-extrabold tracking-[-0.025em]">Add a Park</h1>
            <p className="mt-3 mb-10 text-muted-foreground">
                A Moderator checks every new Park before anyone else sees it.
            </p>
            <SampleForm
                state={state}
                className="gap-7"
                actions={
                    <div className="flex items-center gap-6">
                        <Button type="submit">Add Park</Button>
                        <Button type="button" variant="link" className="px-0" onClick={state.showErrors}>
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
        <footer className="mt-16 border-t">
            <div className={cn(wrap, 'flex flex-wrap justify-between gap-4 py-8 text-sm text-muted-foreground')}>
                <span>Data under ODbL, code under AGPL</span>
                {children}
            </div>
        </footer>
    );
}
