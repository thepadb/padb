// PROTOTYPE (issue #41): design F's browser. A tree of Country, Destination, Park and Ride, each level
// fetched only when opened; typing searches everything instead.
import { Link } from '@tanstack/react-router';
import { Dialog } from '@base-ui/react/dialog';
import { ChevronRightIcon, LoaderIcon, XIcon } from 'lucide-react';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { inputClasses } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import { countryName, findPark, type Park, parks, type Resort, resorts, ridesIn, rides } from '../data';
import { StatusDot } from '../shared';
import { currentStatus } from '../status-line';

export type Current = { country?: string; resort?: string; park?: string; ride?: string };

const row =
    'flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted [&.active]:bg-accent [&.active]:text-accent-foreground';
const count = 'ml-auto pl-2 text-xs text-muted-foreground tabular';

/** A Destination is a Resort, or a Park with no Resort. See ADR 0009 */
type Destination = { kind: 'resort'; resort: Resort } | { kind: 'park'; park: Park };

const countries = [...new Set(parks.map(park => park.country))]
    .map(code => {
        const destinations: Array<Destination> = [
            ...resorts.filter(resort => resort.country === code).map(resort => ({ kind: 'resort' as const, resort })),
            ...parks
                .filter(park => park.country === code && !park.resort)
                .map(park => ({ kind: 'park' as const, park })),
        ].sort((a, b) =>
            (a.kind === 'resort' ? a.resort.name : a.park.name).localeCompare(
                b.kind === 'resort' ? b.resort.name : b.park.name,
                'en-GB',
            ),
        );
        return { code, name: countryName(code), destinations };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));

/** Stands in for fetching a level when it opens, e.g. /destinations?country=GB. Open-on-load levels skip it. */
function Fetched({ instant, children }: { instant: boolean; children: React.ReactNode }) {
    const [ready, setReady] = useState(instant);
    useEffect(() => {
        if (ready) return;
        const timer = setTimeout(() => setReady(true), 350);
        return () => clearTimeout(timer);
    }, [ready]);
    return ready ? (
        children
    ) : (
        <p className="flex items-center gap-2 py-1 pl-7 text-xs text-muted-foreground" role="status">
            <LoaderIcon className="size-3 animate-spin" /> Loading
        </p>
    );
}

function Node({
    id,
    label,
    open,
    initial,
    toggle,
    link,
    children,
}: {
    id: string;
    label: string;
    open: Set<string>;
    initial: Set<string>;
    toggle: (id: string) => void;
    link: React.ReactNode;
    children?: () => React.ReactNode;
}) {
    const expanded = open.has(id);
    return (
        <li>
            <div className="flex items-center">
                {children ? (
                    <button
                        type="button"
                        onClick={() => toggle(id)}
                        aria-expanded={expanded}
                        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${label}`}
                        className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted"
                    >
                        <ChevronRightIcon className={cn('size-3.5 transition-transform', expanded && 'rotate-90')} />
                    </button>
                ) : (
                    <span className="size-6 shrink-0" />
                )}
                {link}
            </div>
            {children && expanded && (
                <ul className="ml-3 border-l pl-1.5">
                    <Fetched instant={initial.has(id)}>{children()}</Fetched>
                </ul>
            )}
        </li>
    );
}

type Level = { current: Current; open: Set<string>; initial: Set<string>; toggle: (id: string) => void };

function ParkNode({ park, current, open, initial, toggle }: Level & { park: Park }) {
    const parkRides = ridesIn(park.id);
    return (
        <Node
            id={`p:${park.id}`}
            label={park.name}
            open={open}
            initial={initial}
            toggle={toggle}
            link={
                <Link
                    to="/parks/$park"
                    params={{ park: park.id }}
                    className={cn(row, current.park === park.id && !current.ride && 'active')}
                    activeProps={{}}
                >
                    <StatusDot status={currentStatus(park.statusHistory)} className="size-2" />
                    <span className="truncate">{park.name}</span>
                    {parkRides.length > 0 && <span className={count}>{parkRides.length}</span>}
                </Link>
            }
        >
            {parkRides.length
                ? () =>
                      parkRides.map(ride => (
                          <li key={ride.id} className="flex">
                              <span className="size-6 shrink-0" />
                              <Link
                                  to="/rides/$ride"
                                  params={{ ride: ride.id }}
                                  className={cn(row, current.ride === ride.id && 'active')}
                                  activeProps={{}}
                              >
                                  <span className="truncate">{ride.name}</span>
                              </Link>
                          </li>
                      ))
                : undefined}
        </Node>
    );
}

function Tree({ current }: { current: Current }) {
    // Levels open when the page loads arrive with the page; only later opens fetch
    const [initial] = useState(() => {
        const park = current.park ? findPark(current.park) : undefined;
        const ids = [
            current.country && `c:${current.country}`,
            (current.resort ?? park?.resort) && `r:${current.resort ?? park?.resort}`,
            current.park && `p:${current.park}`,
        ].filter((id): id is string => Boolean(id));
        return new Set(ids);
    });
    const [open, setOpen] = useState(initial);
    const toggle = (id: string) =>
        setOpen(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    const props = { current, open, initial, toggle };
    return (
        <ul className="space-y-px">
            {countries.map(country => (
                <Node
                    key={country.code}
                    id={`c:${country.code}`}
                    label={country.name}
                    open={open}
                    initial={initial}
                    toggle={toggle}
                    link={
                        <Link
                            to="/parks"
                            search={{ country: country.code }}
                            className={cn(
                                row,
                                current.country === country.code && !current.park && !current.resort && 'active',
                            )}
                            activeProps={{}}
                        >
                            <span className="truncate">{country.name}</span>
                            <span className={count}>{country.destinations.length}</span>
                        </Link>
                    }
                >
                    {() =>
                        country.destinations.map(destination =>
                            destination.kind === 'park' ? (
                                <ParkNode key={destination.park.id} park={destination.park} {...props} />
                            ) : (
                                <Node
                                    key={destination.resort.id}
                                    id={`r:${destination.resort.id}`}
                                    label={destination.resort.name}
                                    open={open}
                                    initial={initial}
                                    toggle={toggle}
                                    link={
                                        <Link
                                            to="/resorts/$resort"
                                            params={{ resort: destination.resort.id }}
                                            className={cn(
                                                row,
                                                current.resort === destination.resort.id && !current.park && 'active',
                                            )}
                                            activeProps={{}}
                                        >
                                            <span className="truncate font-medium">{destination.resort.name}</span>
                                        </Link>
                                    }
                                >
                                    {() => (
                                        <>
                                            {destination.resort.parks.map(id => {
                                                const park = findPark(id);
                                                return park ? <ParkNode key={id} park={park} {...props} /> : null;
                                            })}
                                            {destination.resort.hotels.length > 0 && (
                                                <li className="pt-1 pb-0.5 pl-7 text-xs text-muted-foreground">
                                                    Hotels
                                                </li>
                                            )}
                                            {destination.resort.hotels.map(hotel => (
                                                <li key={hotel.name} className="flex">
                                                    <span className="size-6 shrink-0" />
                                                    <Link
                                                        to="/resorts/$resort"
                                                        params={{ resort: destination.resort.id }}
                                                        hash="hotels"
                                                        className={row}
                                                        activeProps={{}}
                                                    >
                                                        <span className="truncate">{hotel.name}</span>
                                                    </Link>
                                                </li>
                                            ))}
                                        </>
                                    )}
                                </Node>
                            ),
                        )
                    }
                </Node>
            ))}
        </ul>
    );
}

type Kind = 'Park' | 'Ride' | 'Resort' | 'Hotel';
type Hit = { kind: Kind; key: string; name: string; where: string; formerly?: string; to: React.ReactNode };

const KINDS: Array<{ kind: Kind; label: string }> = [
    { kind: 'Park', label: 'Parks' },
    { kind: 'Ride', label: 'Rides' },
    { kind: 'Resort', label: 'Resorts' },
    { kind: 'Hotel', label: 'Hotels' },
];

const hitClass = 'block rounded-md px-2 py-1.5 hover:bg-muted';

/** Everything searchable, by current and former names. A real search would ask the API. */
const index = [
    ...parks.map(park => ({
        kind: 'Park' as const,
        key: `p:${park.id}`,
        name: park.name,
        names: park.nameHistory.map(entry => entry.name),
        where: park.resort
            ? `Park at ${resorts.find(r => r.id === park.resort)?.name}`
            : `Park in ${countryName(park.country)}`,
        link: (body: React.ReactNode) => (
            <Link to="/parks/$park" params={{ park: park.id }} className={hitClass} activeProps={{}}>
                {body}
            </Link>
        ),
    })),
    ...rides.map(ride => ({
        kind: 'Ride' as const,
        key: `d:${ride.id}`,
        name: ride.name,
        names: ride.nameHistory.map(entry => entry.name),
        where: `${ride.category} at ${findPark(ride.park)?.name ?? 'an unknown Park'}`,
        link: (body: React.ReactNode) => (
            <Link to="/rides/$ride" params={{ ride: ride.id }} className={hitClass} activeProps={{}}>
                {body}
            </Link>
        ),
    })),
    ...resorts.map(resort => ({
        kind: 'Resort' as const,
        key: `r:${resort.id}`,
        name: resort.name,
        names: resort.nameHistory.map(entry => entry.name),
        where: `Resort in ${countryName(resort.country)}`,
        link: (body: React.ReactNode) => (
            <Link to="/resorts/$resort" params={{ resort: resort.id }} className={hitClass} activeProps={{}}>
                {body}
            </Link>
        ),
    })),
    ...resorts.flatMap(resort =>
        resort.hotels.map(hotel => ({
            kind: 'Hotel' as const,
            key: `h:${resort.id}:${hotel.name}`,
            name: hotel.name,
            names: [] as Array<string>,
            where: `Hotel at ${resort.name}`,
            link: (body: React.ReactNode) => (
                <Link
                    to="/resorts/$resort"
                    params={{ resort: resort.id }}
                    hash="hotels"
                    className={hitClass}
                    activeProps={{}}
                >
                    {body}
                </Link>
            ),
        })),
    ),
];

const fold = (text: string) =>
    text
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLocaleLowerCase('en-GB');

function search(query: string): Array<Hit> {
    const needle = fold(query.trim());
    return index.flatMap(item => {
        const formerly = item.names.find(name => fold(name).includes(needle));
        if (!fold(item.name).includes(needle) && !formerly) return [];
        return [
            {
                kind: item.kind,
                key: item.key,
                name: item.name,
                where: item.where,
                formerly: fold(item.name).includes(needle) ? undefined : formerly,
                to: item.link(
                    <>
                        <span className="block text-sm leading-snug">{item.name}</span>
                        <span className="block text-xs text-muted-foreground">
                            {item.where}
                            {formerly && !fold(item.name).includes(needle) && `, formerly ${formerly}`}
                        </span>
                    </>,
                ),
            },
        ];
    });
}

/** Results with type chips; chips with nothing in them are hidden. */
function useResults(query: string) {
    const [scope, setScope] = useState<Kind | 'all'>('all');
    const hits = search(query);
    const kinds = KINDS.map(k => ({ ...k, n: hits.filter(hit => hit.kind === k.kind).length })).filter(k => k.n > 0);
    // A chip can vanish as the query changes; fall back to everything
    const active = kinds.some(k => k.kind === scope) ? scope : 'all';
    return { hits, kinds, active, setScope, shown: hits.filter(hit => active === 'all' || hit.kind === active) };
}

function Chips({ results, touch = false }: { results: ReturnType<typeof useResults>; touch?: boolean }) {
    const chip = (on: boolean) =>
        cn(
            'shrink-0 rounded-md border hover:bg-muted',
            touch ? 'min-h-11 min-w-11 px-3.5 text-sm' : 'px-2 py-0.5 text-xs',
            on && 'border-primary bg-secondary text-secondary-foreground hover:bg-secondary',
        );
    if (results.hits.length === 0) return null;
    return (
        <fieldset className={cn('flex gap-1.5', touch ? 'overflow-x-auto' : 'mb-2 flex-wrap')}>
            <legend className="sr-only">Show</legend>
            <button
                type="button"
                className={chip(results.active === 'all')}
                aria-pressed={results.active === 'all'}
                onClick={() => results.setScope('all')}
            >
                All {results.hits.length}
            </button>
            {results.kinds.map(({ kind, label, n }) => (
                <button
                    key={kind}
                    type="button"
                    className={chip(results.active === kind)}
                    aria-pressed={results.active === kind}
                    onClick={() => results.setScope(kind)}
                >
                    {label} {n}
                </button>
            ))}
        </fieldset>
    );
}

function Hits({ query, results }: { query: string; results: ReturnType<typeof useResults> }) {
    return results.shown.length ? (
        <ul aria-live="polite">
            {results.shown.map(hit => (
                <li key={hit.key}>{hit.to}</li>
            ))}
        </ul>
    ) : (
        <p className="px-2 py-1.5 text-sm text-muted-foreground" aria-live="polite">
            Nothing called “{query.trim()}”. Check the spelling or try a former name.
        </p>
    );
}

function Results({ query }: { query: string }) {
    const results = useResults(query);
    return (
        <div>
            <Chips results={results} />
            <Hits query={query} results={results} />
        </div>
    );
}

/** The visible part of the screen, which shrinks when an on-screen keyboard opens. */
function useVisibleViewport() {
    const [box, setBox] = useState<{ top: number; height: number } | null>(null);
    useEffect(() => {
        const viewport = window.visualViewport;
        if (!viewport) return;
        const update = () => setBox({ top: viewport.offsetTop, height: viewport.height });
        update();
        viewport.addEventListener('resize', update);
        viewport.addEventListener('scroll', update);
        return () => {
            viewport.removeEventListener('resize', update);
            viewport.removeEventListener('scroll', update);
        };
    }, []);
    return box;
}

/** Mobile search: a drawer with the field at the bottom, in thumb reach, kept above the keyboard. */
export function SearchDrawer({ trigger }: { trigger: React.ReactElement }) {
    const [query, setQuery] = useState('');
    const input = useRef<HTMLInputElement>(null);
    const box = useVisibleViewport();
    const results = useResults(query);
    const gap = 40;
    return (
        <Dialog.Root>
            <Dialog.Trigger render={trigger} />
            <Dialog.Portal>
                <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
                <Dialog.Popup
                    initialFocus={input}
                    style={box ? { top: box.top + gap, height: box.height - gap } : { top: gap, bottom: 0 }}
                    className="fixed inset-x-0 z-50 flex flex-col rounded-t-xl border-t bg-card shadow-xl transition-transform duration-200 data-ending-style:translate-y-full data-starting-style:translate-y-full"
                >
                    <div className="flex items-center justify-between border-b px-4 py-1">
                        <Dialog.Title className="text-sm font-semibold">Search</Dialog.Title>
                        <Dialog.Close
                            aria-label="Close"
                            className="grid size-11 place-items-center rounded-md hover:bg-muted"
                        >
                            <XIcon className="size-5" />
                        </Dialog.Close>
                    </div>
                    {/* Results grow up from the field, so the nearest are nearest the thumb */}
                    <div className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto p-2 [&_a]:py-2.5">
                        {query.trim() ? (
                            <Hits query={query} results={results} />
                        ) : (
                            <p className="px-2 py-2 text-sm text-muted-foreground">
                                Search Parks, Rides, Resorts and Hotels by current or former name.
                            </p>
                        )}
                    </div>
                    <div className="space-y-2 border-t px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                        {query.trim() && <Chips results={results} touch />}
                        <input
                            ref={input}
                            type="search"
                            enterKeyHint="search"
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            placeholder="Search Parks, Rides, Resorts, Hotels"
                            aria-label="Search Parks, Rides, Resorts and Hotels"
                            // 16px stops iOS zooming into the field
                            className={cn(inputClasses, 'h-12 text-base')}
                        />
                    </div>
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

/** The tree, with search above it on wide screens. On mobile, search has its own drawer. */
export function Browser({ current, searchable = true }: { current: Current; searchable?: boolean }) {
    const [query, setQuery] = useState('');
    if (!searchable) {
        return (
            <nav aria-label="Browse">
                <Tree current={current} />
            </nav>
        );
    }
    return (
        <nav aria-label="Browse" className="p-3">
            <input
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search Parks, Rides, Resorts, Hotels"
                aria-label="Search Parks, Rides, Resorts and Hotels"
                className={cn(inputClasses, 'mb-3')}
            />
            {query.trim() ? <Results query={query} /> : <Tree current={current} />}
        </nav>
    );
}
