// PROTOTYPE (issue #41): design C, "Midway". Playful: the fairground's own objects. A marquee sign for
// every hero, Parks as admission tickets, Areas as signposts, ride height on a measuring stick.
import { Link, useNavigate } from '@tanstack/react-router';
import { ShuffleIcon } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { statusName } from '@/lib/status';
import { cn } from '@/lib/utils';
import { countryName, findPark, findResort, type Park, parks, type Resort, type Ride, ridesIn } from '../data';
import { Placeholder } from '../placeholder';
import { PreviewLink } from '../preview-link';
import { SampleForm, useSampleForm } from '../sample-form';
import { NameTable, openedOf, PartialDate, type ParksList, StatusDot, StatusTable, useParksList } from '../shared';
import { currentStatus, statusLine } from '../status-line';

const wrap = 'mx-auto w-full max-w-6xl px-4 sm:px-6';
const flag = (code: string) => String.fromCodePoint(...[...code].map(c => 0x1f1a5 + c.charCodeAt(0)));
const board = 'rounded-3xl border-[3px] border-foreground bg-card';
const PLATES = [
    'bg-primary text-primary-foreground',
    'bg-accent text-accent-foreground',
    'bg-secondary text-secondary-foreground',
];

function SurpriseMe() {
    const navigate = useNavigate();
    return (
        <Button
            size="sm"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            onClick={() =>
                navigate({ to: '/parks/$park', params: { park: parks[Math.floor(Math.random() * parks.length)].id } })
            }
        >
            <ShuffleIcon className="size-4" /> Surprise me
        </Button>
    );
}

export function Header() {
    return (
        <header>
            <div className="bg-[#1b2a4a] text-[#fff4d6] dark:bg-[#0a1226]">
                <div className={cn(wrap, 'flex h-16 items-center gap-5')}>
                    <Link to="/" className="font-display text-2xl">
                        PADB
                    </Link>
                    <nav className="flex gap-4 font-semibold [&_a.active]:text-secondary [&_a:hover]:text-secondary">
                        <Link to="/parks">Parks</Link>
                        <Link to="/resorts/$resort" params={{ resort: 'lakeside' }}>
                            Resorts
                        </Link>
                        <Link to="/parks/new" className="hidden sm:inline">
                            Add a Park
                        </Link>
                    </nav>
                    <div className="ml-auto">
                        <SurpriseMe />
                    </div>
                </div>
            </div>
            <div className="awning" aria-hidden="true" />
        </header>
    );
}

/** A ring of bulbs around the sign; they chase once on load (reduced motion: they just glow). */
function Bulbs() {
    const along = (count: number) => Array.from({ length: count }, (_, i) => (i / (count - 1)) * 100);
    const spots = [
        ...along(16).map(x => ({ left: x, top: 0 })),
        ...along(16).map(x => ({ left: 100 - x, top: 100 })),
        ...along(6)
            .slice(1, -1)
            .map(y => ({ left: 100, top: y })),
        ...along(6)
            .slice(1, -1)
            .map(y => ({ left: 0, top: 100 - y })),
    ];
    return (
        <div aria-hidden="true" className="pointer-events-none absolute inset-3">
            {spots.map((spot, i) => (
                <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed decoration
                    key={i}
                    className="marquee-bulb absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary shadow-[0_0_10px_2px_var(--secondary)]"
                    style={{ left: `${spot.left}%`, top: `${spot.top}%`, ['--i' as string]: i }}
                />
            ))}
        </div>
    );
}

function Marquee({ name, kicker, children }: { name: string; kicker: React.ReactNode; children?: React.ReactNode }) {
    return (
        <section className="relative mt-8 rounded-[2rem] border-4 border-secondary bg-[#1b2a4a] p-8 text-[#fff4d6] sm:p-12 dark:bg-card">
            <Bulbs />
            <div className="relative grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_15rem]">
                <div className="min-w-0">
                    <p className="text-lg font-semibold">{kicker}</p>
                    <h1 className="mt-2 font-display text-3xl leading-[1.05] text-secondary break-words hyphens-auto sm:text-5xl">
                        {name}
                    </h1>
                    {children}
                </div>
                <Placeholder
                    name={name}
                    className="aspect-square w-40 rounded-2xl border-4 border-secondary md:w-full"
                />
            </div>
        </section>
    );
}

function Pill({ text, status }: { text: string | null; status?: Park['statusHistory'][number]['status'] }) {
    return text ? (
        <p className="mt-5 inline-flex items-center gap-2.5 rounded-full bg-[#fff4d6] px-4 py-2 font-bold text-[#1b2a4a]">
            <StatusDot status={status} className="size-3" />
            {text}
        </p>
    ) : null;
}

/** Facts on a ticket: perforated between the heading and the rows. */
function FactTicket({ title, rows }: { title: string; rows: Array<[string, React.ReactNode]> }) {
    return (
        <aside className={cn(board, 'relative h-fit lg:sticky lg:top-6')}>
            <h2 className="px-5 pt-4 pb-3 font-display text-lg">{title}</h2>
            <div className="relative border-t-[3px] border-dashed border-foreground">
                <span className="absolute -top-3.5 -left-3.5 size-6 rounded-full border-[3px] border-foreground bg-background [clip-path:inset(0_0_0_50%)]" />
                <span className="absolute -top-3.5 -right-3.5 size-6 rounded-full border-[3px] border-foreground bg-background [clip-path:inset(0_50%_0_0)]" />
            </div>
            <dl className="grid gap-3 px-5 py-4">
                {rows.map(([label, value]) => (
                    <div key={label}>
                        <dt className="text-sm text-muted-foreground">{label}</dt>
                        <dd className="font-bold break-words">{value}</dd>
                    </div>
                ))}
            </dl>
        </aside>
    );
}

function Layout({
    hero,
    aside,
    children,
}: {
    hero: React.ReactNode;
    aside: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <main className={wrap}>
            {hero}
            <div className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
                <div className="grid min-w-0 content-start gap-10">{children}</div>
                {aside}
            </div>
        </main>
    );
}

function Heading({ children }: { children: string }) {
    return <h2 className="mb-4 font-display text-2xl">{children}</h2>;
}

/** Areas as plates on a signpost, alternating sides of the pole. */
function Signpost({ areas }: { areas: Array<string> }) {
    if (areas.length === 0) return <p className="text-lg">No signposts yet: this Park has no Areas recorded.</p>;
    const rows = Math.ceil(areas.length / 2);
    return (
        <ul className="grid grid-cols-[minmax(0,1fr)_0.75rem_minmax(0,1fr)] gap-y-2">
            <li
                aria-hidden="true"
                className="col-start-2 rounded-full bg-foreground"
                style={{ gridRow: `1 / span ${rows + 1}` }}
            />
            {areas.map((area, i) => {
                const left = i % 2 === 0;
                return (
                    <li
                        key={area}
                        style={{ gridRow: Math.floor(i / 2) + 1 }}
                        className={cn(
                            'max-w-full truncate py-1.5 text-sm font-bold',
                            PLATES[i % PLATES.length],
                            left
                                ? 'col-start-1 justify-self-end pr-3 pl-5 [clip-path:polygon(0.75rem_0,100%_0,100%_100%,0.75rem_100%,0_50%)]'
                                : 'col-start-3 justify-self-start pr-5 pl-3 [clip-path:polygon(0_0,calc(100%-0.75rem)_0,100%_50%,calc(100%-0.75rem)_100%,0_100%)]',
                        )}
                    >
                        {area}
                    </li>
                );
            })}
        </ul>
    );
}

/** Rides listed like the board by a queue line. */
function RideBoard({ rides }: { rides: Array<Ride> }) {
    return (
        <ul className="overflow-hidden rounded-3xl bg-[#1b2a4a] text-[#fff4d6] dark:bg-card">
            {rides.map(ride => (
                <li
                    key={ride.id}
                    className="flex items-center justify-between gap-4 border-b-2 border-dashed border-white/15 px-5 py-3 last:border-0"
                >
                    <span className="flex min-w-0 items-center gap-3">
                        <StatusDot status={currentStatus(ride.statusHistory)} className="size-3" />
                        <PreviewLink
                            kind="ride"
                            id={ride.id}
                            className="truncate font-bold underline decoration-secondary decoration-2 underline-offset-4 hover:text-secondary"
                        >
                            {ride.name}
                        </PreviewLink>
                    </span>
                    <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-sm font-bold text-[#1b2a4a]">
                        {ride.category}
                    </span>
                </li>
            ))}
        </ul>
    );
}

const yearOf = (park: Park) => {
    const opened = openedOf(park.statusHistory);
    if (opened) return opened.slice(0, 4);
    const everOperated = park.statusHistory.some(entry => entry.status === 'operating');
    return park.statusHistory.length && !everOperated ? 'Soon' : '?';
};

/** A Park as an admission ticket with a tear-off stub. */
function Ticket({ park }: { park: Park }) {
    return (
        <Link to="/parks/$park" params={{ park: park.id }} className={cn(board, 'group flex h-full overflow-hidden')}>
            <div className="min-w-0 flex-1 p-3">
                <Placeholder name={park.name} className="aspect-[16/9] w-full rounded-xl" />
                <p className="mt-3 line-clamp-2 text-lg leading-tight font-extrabold group-hover:underline">
                    {park.name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    {flag(park.country)} {countryName(park.country)}
                </p>
                {statusLine(park.statusHistory) && (
                    <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
                        <StatusDot status={currentStatus(park.statusHistory)} />
                        {statusLine(park.statusHistory)}
                    </p>
                )}
            </div>
            <div className="relative flex w-14 shrink-0 items-center justify-center border-l-[3px] border-dashed border-foreground bg-secondary text-secondary-foreground">
                <span className="absolute -top-3 -left-3 size-6 rounded-full border-[3px] border-foreground bg-background" />
                <span className="absolute -bottom-3 -left-3 size-6 rounded-full border-[3px] border-foreground bg-background" />
                <span className="rotate-180 font-display text-xl [writing-mode:vertical-rl]">{yearOf(park)}</span>
            </div>
        </Link>
    );
}

export function ParkPage({ park }: { park: Park }) {
    const resort = park.resort ? findResort(park.resort) : undefined;
    const rides = ridesIn(park.id);
    const status = currentStatus(park.statusHistory);
    return (
        <Layout
            hero={
                <Marquee
                    name={park.name}
                    kicker={
                        <>
                            {flag(park.country)} {countryName(park.country)}
                            {resort && (
                                <>
                                    , at{' '}
                                    <PreviewLink
                                        kind="resort"
                                        id={resort.id}
                                        className="underline decoration-secondary decoration-2 underline-offset-4"
                                    >
                                        {resort.name}
                                    </PreviewLink>
                                </>
                            )}
                        </>
                    }
                >
                    <Pill text={statusLine(park.statusHistory)} status={status} />
                </Marquee>
            }
            aside={
                <FactTicket
                    title="Park facts"
                    rows={[
                        ['Status', status ? statusName(status) : 'Not recorded'],
                        ['Opened', <PartialDate key="o" value={openedOf(park.statusHistory)} />],
                        ['Operator', park.operator],
                        ...(park.website
                            ? [
                                  [
                                      'Website',
                                      <a key="w" className="underline" href={park.website}>
                                          {new URL(park.website).host}
                                      </a>,
                                  ] as [string, React.ReactNode],
                              ]
                            : []),
                    ]}
                />
            }
        >
            {rides.length > 0 && (
                <section>
                    <Heading>{`${rides.length} Rides`}</Heading>
                    <RideBoard rides={rides} />
                </section>
            )}
            <section>
                <Heading>{`${park.areas.length} Areas`}</Heading>
                <Signpost areas={park.areas} />
            </section>
            <div className="grid gap-8 md:grid-cols-2">
                <section className={cn(board, 'p-5')}>
                    <Heading>Status History</Heading>
                    <StatusTable rows={park.statusHistory} />
                </section>
                <section className={cn(board, 'p-5')}>
                    <Heading>Name History</Heading>
                    <NameTable rows={park.nameHistory} />
                </section>
            </div>
        </Layout>
    );
}

function CountryTokens({ list }: { list: ParksList }) {
    const token = (active: boolean) =>
        cn(
            'flex w-full items-center gap-3 rounded-full border-[3px] border-foreground px-3 py-1.5 text-left font-semibold',
            active
                ? 'bg-primary text-primary-foreground'
                : 'bg-card hover:bg-secondary hover:text-secondary-foreground',
        );
    return (
        <ul className="grid gap-2">
            <li>
                <button type="button" className={token(!list.country)} onClick={() => list.setCountry(undefined)}>
                    <span className="text-xl">🎡</span> Anywhere
                </button>
            </li>
            {list.countries.map(country => (
                <li key={country.code}>
                    <button
                        type="button"
                        className={token(list.country === country.code)}
                        onClick={() => list.setCountry(country.code)}
                    >
                        <span className="text-xl">{flag(country.code)}</span>
                        <span className="flex-1">{country.name}</span>
                        <span className="tabular">{country.count}</span>
                    </button>
                </li>
            ))}
        </ul>
    );
}

export function ParksPage() {
    const list = useParksList();
    return (
        <main className={wrap}>
            <div className="flex flex-wrap items-end justify-between gap-4 pt-10 pb-8">
                <div>
                    <h1 className="font-display text-5xl sm:text-6xl">Pick a park</h1>
                    <p className="mt-2 text-lg">
                        {list.total} {list.total === 1 ? 'ticket' : 'tickets'}{' '}
                        {list.country ? `for ${countryName(list.country)}` : 'from around the world'}
                    </p>
                </div>
                <div className="lg:hidden">
                    <Sheet
                        title="Where to?"
                        trigger={
                            <Button variant="outline">
                                {list.country ? `${flag(list.country)} ${countryName(list.country)}` : '🎡 Anywhere'}
                            </Button>
                        }
                    >
                        <CountryTokens list={list} />
                    </Sheet>
                </div>
            </div>
            <div className="grid gap-8 pb-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
                <aside className="hidden lg:block">
                    <h2 className="mb-3 font-display text-lg">Where to?</h2>
                    <CountryTokens list={list} />
                </aside>
                <div>
                    <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {list.parks.map(park => (
                            <li key={park.id}>
                                <Ticket park={park} />
                            </li>
                        ))}
                    </ul>
                    {list.hasMore && (
                        <div className="mt-10 flex justify-center">
                            <Button size="lg" onClick={list.loadMore}>
                                Load more tickets
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

/** "You must be this tall": the ride's height on a measuring stick. */
function HeightStick({ height }: { height?: number }) {
    if (!height) return <p className="text-lg">Nobody has measured this one yet.</p>;
    const top = Math.max(60, Math.ceil(height / 10) * 10);
    const buses = Math.round(height / 4.4);
    return (
        <div className="flex items-end gap-6">
            <div className="relative h-72 w-16 rounded-full border-[3px] border-foreground bg-card">
                {Array.from({ length: top / 10 + 1 }, (_, i) => i * 10).map(metres => (
                    <span
                        key={metres}
                        className="absolute left-0 w-3 border-t-2 border-foreground"
                        style={{ bottom: `${(metres * 100) / top}%` }}
                    />
                ))}
                <div
                    className="absolute inset-x-1.5 bottom-1.5 rounded-full bg-[repeating-linear-gradient(0deg,var(--primary)_0_14px,#fff_14px_28px)]"
                    style={{ height: `calc(${(height * 100) / top}% - 0.75rem)` }}
                />
            </div>
            <div>
                <p className="font-display text-5xl">{height} m</p>
                <p className="mt-1 text-lg">
                    About {buses} double-decker {buses === 1 ? 'bus' : 'buses'} stacked up.
                </p>
            </div>
        </div>
    );
}

export function RidePage({ ride }: { ride: Ride }) {
    const park = findPark(ride.park);
    const status = currentStatus(ride.statusHistory);
    return (
        <Layout
            hero={
                <Marquee
                    name={ride.name}
                    kicker={
                        park ? (
                            <>
                                {ride.category} at{' '}
                                <PreviewLink
                                    kind="park"
                                    id={park.id}
                                    className="underline decoration-secondary decoration-2 underline-offset-4"
                                >
                                    {park.name}
                                </PreviewLink>
                            </>
                        ) : (
                            ride.category
                        )
                    }
                >
                    <Pill text={statusLine(ride.statusHistory)} status={status} />
                </Marquee>
            }
            aside={
                <FactTicket
                    title="Ride facts"
                    rows={[
                        ['Area', ride.area ?? 'Not recorded'],
                        ['Manufacturer', ride.manufacturer],
                        ['Ride Model', ride.model ?? 'None'],
                        ['Top speed', ride.speedKmh ? `${ride.speedKmh} km/h` : 'Not recorded'],
                        ['Opened', <PartialDate key="o" value={openedOf(ride.statusHistory)} />],
                    ]}
                />
            }
        >
            <section>
                <Heading>How tall?</Heading>
                <HeightStick height={ride.heightM} />
            </section>
            <div className="grid gap-8 md:grid-cols-2">
                <section className={cn(board, 'p-5')}>
                    <Heading>Status History</Heading>
                    <StatusTable rows={ride.statusHistory} />
                </section>
                <section className={cn(board, 'p-5')}>
                    <Heading>Name History</Heading>
                    <NameTable rows={ride.nameHistory} />
                </section>
            </div>
        </Layout>
    );
}

export function ResortPage({ resort }: { resort: Resort }) {
    return (
        <Layout
            hero={
                <Marquee name={resort.name} kicker={`${flag(resort.country)} Resort in ${countryName(resort.country)}`}>
                    <p className="mt-5 text-xl font-bold">
                        {resort.parks.length} {resort.parks.length === 1 ? 'Park' : 'Parks'} and {resort.hotels.length}{' '}
                        {resort.hotels.length === 1 ? 'Hotel' : 'Hotels'}
                    </p>
                </Marquee>
            }
            aside={
                <FactTicket
                    title="Resort facts"
                    rows={[
                        ['Operator', resort.operator],
                        ['Country', countryName(resort.country)],
                    ]}
                />
            }
        >
            <section>
                <Heading>Parks</Heading>
                <ul className="grid gap-6 sm:grid-cols-2">
                    {resort.parks.map(id => {
                        const park = findPark(id);
                        return park ? (
                            <li key={id}>
                                <Ticket park={park} />
                            </li>
                        ) : null;
                    })}
                </ul>
            </section>
            <section>
                <Heading>Hotels</Heading>
                <ul className="grid gap-3">
                    {resort.hotels.map((hotel, i) => (
                        <li
                            key={hotel.name}
                            className={cn(
                                'flex items-center justify-between gap-4 rounded-2xl px-5 py-3 font-bold',
                                PLATES[i % PLATES.length],
                            )}
                        >
                            {hotel.name}
                            <span className="font-semibold">
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
            <section className={cn(board, 'p-5')}>
                <Heading>Name History</Heading>
                <NameTable rows={resort.nameHistory} />
            </section>
        </Layout>
    );
}

export function FormPage() {
    const state = useSampleForm();
    return (
        <main className={cn(wrap, 'py-10')}>
            <div className={cn(board, 'mx-auto flex max-w-3xl overflow-hidden')}>
                <div className="min-w-0 flex-1 p-6 sm:p-10">
                    <h1 className="font-display text-4xl">Add a Park</h1>
                    <p className="mt-2 mb-8 text-lg">
                        Know a park we’re missing? Tell us the basics and a Moderator will check it.
                    </p>
                    <SampleForm
                        state={state}
                        actions={
                            <div className="flex flex-wrap gap-4">
                                <Button type="submit" size="lg">
                                    Add Park
                                </Button>
                                <Button type="button" variant="ghost" size="lg" onClick={state.showErrors}>
                                    Show error states
                                </Button>
                            </div>
                        }
                    />
                </div>
                <div
                    aria-hidden="true"
                    className="relative hidden w-20 shrink-0 items-center justify-center border-l-[3px] border-dashed border-foreground bg-primary text-primary-foreground sm:flex"
                >
                    <span className="rotate-180 font-display text-2xl [writing-mode:vertical-rl]">
                        Admit one new Park
                    </span>
                </div>
            </div>
        </main>
    );
}

export function Footer({ children }: { children: React.ReactNode }) {
    return (
        <footer className="mt-16 bg-[#1b2a4a] text-[#fff4d6] dark:bg-[#0a1226]">
            <div className={cn(wrap, 'flex flex-wrap justify-between gap-4 py-8 font-semibold')}>
                <span>Built by fans. Data under ODbL, code under AGPL.</span>
                {children}
            </div>
        </footer>
    );
}
