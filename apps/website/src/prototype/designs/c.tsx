// PROTOTYPE (issue #41): design C, "Funfair". Strong palette, rounded shapes, expressive display font.
import { Link } from '@tanstack/react-router';
import { SlidersHorizontalIcon, SparklesIcon } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { statusName } from '@/lib/status';
import { cn } from '@/lib/utils';
import { countryName, findPark, findResort, type Park, type Resort, type Ride, ridesIn } from '../data';
import { Placeholder } from '../placeholder';
import { PreviewLink } from '../preview-link';
import { SampleForm, useSampleForm } from '../sample-form';
import { NameTable, PartialDate, type ParksList, StatusTable, useParksList } from '../shared';
import { currentStatus, statusLine } from '../status-line';

const wrap = 'mx-auto w-full max-w-7xl px-4 sm:px-6';
const chunky = 'rounded-3xl border-2 border-foreground bg-card shadow-[5px_5px_0_var(--foreground)]';
const flag = (code: string) => String.fromCodePoint(...[...code].map(c => 0x1f1a5 + c.charCodeAt(0)));
const TILE_COLOURS = [
    'bg-secondary text-secondary-foreground',
    'bg-accent text-accent-foreground',
    'bg-primary text-primary-foreground',
];

export function Header() {
    return (
        <header className="bg-header text-header-foreground">
            <div className={cn(wrap, 'flex h-16 items-center gap-4')}>
                <Link to="/" className="flex items-center gap-1.5 font-display text-2xl font-bold">
                    <span className="grid size-9 place-items-center rounded-full bg-secondary text-secondary-foreground">
                        <SparklesIcon className="size-5" />
                    </span>
                    padb
                </Link>
                <nav className="ml-auto flex gap-1 font-display text-sm font-medium [&_a]:rounded-full [&_a]:px-3 [&_a]:py-1.5 [&_a:hover]:bg-white/10 [&_a.active]:bg-primary [&_a.active]:text-primary-foreground">
                    <Link to="/parks">Parks</Link>
                    <Link to="/resorts/$resort" params={{ resort: 'lakeside' }}>
                        Resorts
                    </Link>
                    <Link to="/parks/new">Add one!</Link>
                </nav>
            </div>
            <svg
                aria-hidden="true"
                viewBox="0 0 1200 16"
                preserveAspectRatio="none"
                className="block h-3 w-full translate-y-px text-background"
            >
                <path
                    fill="currentColor"
                    d="M0 16V8c50 0 50-8 100-8s50 8 100 8 50-8 100-8 50 8 100 8 50-8 100-8 50 8 100 8 50-8 100-8 50 8 100 8 50-8 100-8 50 8 100 8 50-8 100-8 50 8 100 8 50-8 100-8 50 8 100 8v8z"
                />
            </svg>
        </header>
    );
}

function StatusSticker({ text }: { text: string | null }) {
    return text ? (
        <p className="inline-flex -rotate-2 rounded-full border-2 border-foreground bg-primary px-4 py-1.5 font-display font-semibold text-primary-foreground shadow-[3px_3px_0_var(--foreground)]">
            {text}
        </p>
    ) : null;
}

function Hero({ kind, name, children }: { kind: string; name: string; children?: React.ReactNode }) {
    return (
        <section
            className={cn(
                chunky,
                'grid items-center gap-6 bg-hero p-5 text-hero-foreground md:grid-cols-[16rem_1fr] md:p-8',
            )}
        >
            <Placeholder
                name={name}
                className="aspect-square w-40 rotate-[-3deg] rounded-[2rem] border-2 border-foreground md:w-full"
            />
            <div className="min-w-0">
                <p className="font-display text-sm font-semibold tracking-wide uppercase opacity-70">{kind}</p>
                <h1 className="mt-1 mb-4 font-display text-4xl leading-[1.05] font-bold text-balance break-words hyphens-auto md:text-6xl">
                    {name}
                </h1>
                {children}
            </div>
        </section>
    );
}

function Tiles({ rows }: { rows: Array<[string, React.ReactNode]> }) {
    return (
        <aside className="grid h-fit grid-cols-2 gap-3 lg:grid-cols-1">
            {rows.map(([label, value], i) => (
                <div
                    key={label}
                    className={cn(
                        'rounded-2xl border-2 border-foreground px-4 py-3',
                        TILE_COLOURS[i % TILE_COLOURS.length],
                    )}
                >
                    <p className="text-xs font-semibold tracking-wide uppercase opacity-75">{label}</p>
                    <p className="font-display text-lg leading-tight font-semibold break-words">{value}</p>
                </div>
            ))}
        </aside>
    );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className={cn(chunky, 'p-5')}>
            <h2 className="mb-3 font-display text-2xl font-bold">{title}</h2>
            {children}
        </section>
    );
}

function Pills({ items, empty }: { items: Array<string>; empty: string }) {
    return items.length === 0 ? (
        <p className="text-muted-foreground italic">{empty}</p>
    ) : (
        <ul className="flex flex-wrap gap-2">
            {items.map((item, i) => (
                <li
                    key={item}
                    className={cn(
                        'rounded-full border-2 border-foreground px-3 py-1 text-sm font-medium',
                        i % 3 === 0
                            ? 'bg-secondary text-secondary-foreground'
                            : i % 3 === 1
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-card',
                    )}
                >
                    {item}
                </li>
            ))}
        </ul>
    );
}

function CardGrid({ children }: { children: React.ReactNode }) {
    return <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{children}</ul>;
}

function Card({
    kind,
    id,
    name,
    sub,
    tag,
}: {
    kind: 'park' | 'ride' | 'resort';
    id: string;
    name: string;
    sub?: string | null;
    tag?: string | null;
}) {
    return (
        <li>
            <PreviewLink
                kind={kind}
                id={id}
                className={cn(
                    chunky,
                    'group block h-full overflow-hidden transition hover:-translate-y-1 hover:rotate-[-0.5deg]',
                )}
            >
                <div className="relative">
                    <Placeholder name={name} className="aspect-[16/10] w-full border-b-2 border-foreground" />
                    {tag && (
                        <span className="absolute top-3 left-3 rounded-full border-2 border-foreground bg-card px-2.5 py-0.5 text-xs font-semibold">
                            {tag}
                        </span>
                    )}
                </div>
                <div className="p-4">
                    <p className="line-clamp-2 font-display text-xl leading-tight font-bold group-hover:text-primary">
                        {name}
                    </p>
                    {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
                </div>
            </PreviewLink>
        </li>
    );
}

const opened = (thing: Park | Ride) => thing.statusHistory.find(entry => entry.status === 'operating')?.began ?? null;

function Page({ hero, main, aside }: { hero: React.ReactNode; main: React.ReactNode; aside: React.ReactNode }) {
    return (
        <main className={cn(wrap, 'py-8')}>
            {hero}
            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="grid min-w-0 content-start gap-8">{main}</div>
                {aside}
            </div>
        </main>
    );
}

export function ParkPage({ park }: { park: Park }) {
    const resort = park.resort ? findResort(park.resort) : undefined;
    const rides = ridesIn(park.id);
    const status = currentStatus(park.statusHistory);
    return (
        <Page
            hero={
                <Hero kind={`${flag(park.country)} Park in ${countryName(park.country)}`} name={park.name}>
                    <StatusSticker text={statusLine(park.statusHistory)} />
                    {resort && (
                        <p className="mt-4 font-medium">
                            Part of{' '}
                            <PreviewLink
                                kind="resort"
                                id={resort.id}
                                className="underline decoration-2 underline-offset-4"
                            >
                                {resort.name}
                            </PreviewLink>
                        </p>
                    )}
                </Hero>
            }
            main={
                <>
                    {rides.length > 0 && (
                        <section>
                            <h2 className="mb-4 font-display text-3xl font-bold">
                                Rides <span className="text-primary">{rides.length}</span>
                            </h2>
                            <CardGrid>
                                {rides.map(ride => (
                                    <Card
                                        key={ride.id}
                                        kind="ride"
                                        id={ride.id}
                                        name={ride.name}
                                        sub={ride.manufacturer}
                                        tag={ride.category}
                                    />
                                ))}
                            </CardGrid>
                        </section>
                    )}
                    <Box title={`Areas · ${park.areas.length}`}>
                        <Pills items={park.areas} empty="No Areas yet." />
                    </Box>
                    <div className="grid gap-8 md:grid-cols-2">
                        <Box title="Status History">
                            <StatusTable rows={park.statusHistory} />
                        </Box>
                        <Box title="Name History">
                            <NameTable rows={park.nameHistory} />
                        </Box>
                    </div>
                </>
            }
            aside={
                <Tiles
                    rows={[
                        ['Status', status ? statusName(status) : '-'],
                        ['Opened', <PartialDate key="o" value={opened(park)} />],
                        ['Operator', park.operator],
                        ['Rides', rides.length],
                        ['Areas', park.areas.length],
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
        />
    );
}

function CountryPills({ list }: { list: ParksList }) {
    const pill = (active: boolean) =>
        cn(
            'rounded-full border-2 border-foreground px-3 py-1 text-sm font-medium transition',
            active
                ? 'bg-primary text-primary-foreground shadow-[2px_2px_0_var(--foreground)]'
                : 'bg-card hover:bg-secondary hover:text-secondary-foreground',
        );
    return (
        <div className="flex flex-wrap gap-2">
            <button type="button" className={pill(!list.country)} onClick={() => list.setCountry(undefined)}>
                🌍 Everywhere
            </button>
            {list.countries.map(country => (
                <button
                    key={country.code}
                    type="button"
                    className={pill(list.country === country.code)}
                    onClick={() => list.setCountry(country.code)}
                >
                    {flag(country.code)} {country.name} <span className="opacity-60">{country.count}</span>
                </button>
            ))}
        </div>
    );
}

export function ParksPage() {
    const list = useParksList();
    return (
        <main className={cn(wrap, 'py-8')}>
            <h1 className="font-display text-6xl font-bold">
                Parks<span className="text-primary">!</span>
            </h1>
            <p className="mt-1 text-lg text-muted-foreground">
                {list.total} {list.country ? `in ${countryName(list.country)}` : 'to explore'}
            </p>
            <div className="mt-8 grid gap-8 lg:grid-cols-[15rem_1fr]">
                <aside className={cn(chunky, 'hidden h-fit bg-muted p-4 lg:block')}>
                    <h2 className="mb-3 font-display text-xl font-bold">Where?</h2>
                    <CountryPills list={list} />
                </aside>
                <div>
                    <div className="mb-5 lg:hidden">
                        <Sheet
                            title="Where?"
                            trigger={
                                <Button variant="outline">
                                    <SlidersHorizontalIcon className="size-4" />{' '}
                                    {list.country
                                        ? `${flag(list.country)} ${countryName(list.country)}`
                                        : 'Pick a country'}
                                </Button>
                            }
                        >
                            <CountryPills list={list} />
                        </Sheet>
                    </div>
                    <CardGrid>
                        {list.parks.map(park => (
                            <Card
                                key={park.id}
                                kind="park"
                                id={park.id}
                                name={park.name}
                                sub={statusLine(park.statusHistory)}
                                tag={`${flag(park.country)} ${park.country}`}
                            />
                        ))}
                    </CardGrid>
                    {list.hasMore && (
                        <div className="mt-10 flex justify-center">
                            <Button size="lg" onClick={list.loadMore}>
                                Load more parks
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

export function RidePage({ ride }: { ride: Ride }) {
    const park = findPark(ride.park);
    return (
        <Page
            hero={
                <Hero kind={`${ride.category} Ride`} name={ride.name}>
                    <StatusSticker text={statusLine(ride.statusHistory)} />
                    {park && (
                        <p className="mt-4 font-medium">
                            At{' '}
                            <PreviewLink kind="park" id={park.id} className="underline decoration-2 underline-offset-4">
                                {park.name}
                            </PreviewLink>
                            {ride.area && ` · ${ride.area}`}
                        </p>
                    )}
                </Hero>
            }
            main={
                <div className="grid gap-8 md:grid-cols-2">
                    <Box title="Status History">
                        <StatusTable rows={ride.statusHistory} />
                    </Box>
                    <Box title="Name History">
                        <NameTable rows={ride.nameHistory} />
                    </Box>
                </div>
            }
            aside={
                <Tiles
                    rows={[
                        ['Height', ride.heightM ? `${ride.heightM} m` : '-'],
                        ['Top speed', ride.speedKmh ? `${ride.speedKmh} km/h` : '-'],
                        ['Manufacturer', ride.manufacturer],
                        ['Ride Model', ride.model ?? '-'],
                        ['Category', ride.category],
                        ['Opened', <PartialDate key="o" value={opened(ride)} />],
                    ]}
                />
            }
        />
    );
}

export function ResortPage({ resort }: { resort: Resort }) {
    return (
        <Page
            hero={
                <Hero kind={`${flag(resort.country)} Resort in ${countryName(resort.country)}`} name={resort.name}>
                    <p className="font-display text-xl font-semibold">
                        {resort.parks.length} {resort.parks.length === 1 ? 'Park' : 'Parks'} · {resort.hotels.length}{' '}
                        {resort.hotels.length === 1 ? 'Hotel' : 'Hotels'}
                    </p>
                </Hero>
            }
            main={
                <>
                    <section>
                        <h2 className="mb-4 font-display text-3xl font-bold">Parks</h2>
                        <CardGrid>
                            {resort.parks.map(id => {
                                const park = findPark(id);
                                return park ? (
                                    <Card
                                        key={id}
                                        kind="park"
                                        id={id}
                                        name={park.name}
                                        sub={statusLine(park.statusHistory)}
                                    />
                                ) : null;
                            })}
                        </CardGrid>
                    </section>
                    <Box title="Hotels">
                        <ul className="grid gap-3 sm:grid-cols-2">
                            {resort.hotels.map(hotel => (
                                <li key={hotel.name} className="flex items-center gap-3 rounded-2xl bg-muted p-2">
                                    <Placeholder
                                        name={hotel.name}
                                        className="size-14 rounded-xl border-2 border-foreground"
                                    />
                                    <div>
                                        <p className="font-display font-semibold">{hotel.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Opened <PartialDate value={hotel.opened} />
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Box>
                    <Box title="Name History">
                        <NameTable rows={resort.nameHistory} />
                    </Box>
                </>
            }
            aside={
                <Tiles
                    rows={[
                        ['Operator', resort.operator],
                        ['Parks', resort.parks.length],
                        ['Hotels', resort.hotels.length],
                    ]}
                />
            }
        />
    );
}

export function FormPage() {
    const state = useSampleForm();
    return (
        <main className={cn(wrap, 'py-8')}>
            <div className={cn(chunky, 'mx-auto max-w-2xl p-6 md:p-10')}>
                <h1 className="font-display text-5xl font-bold">
                    Add a Park <span className="inline-block rotate-12">🎢</span>
                </h1>
                <p className="mt-2 mb-8 text-lg text-muted-foreground">
                    A Moderator checks every suggestion before it goes live.
                </p>
                <SampleForm
                    state={state}
                    actions={
                        <div className="flex flex-wrap gap-3">
                            <Button type="submit" size="lg">
                                Send it!
                            </Button>
                            <Button type="button" variant="ghost" size="lg" onClick={state.showErrors}>
                                Show error states
                            </Button>
                        </div>
                    }
                />
            </div>
        </main>
    );
}

export function Footer({ children }: { children: React.ReactNode }) {
    return (
        <footer className="mt-16 bg-header text-header-foreground">
            <div className={cn(wrap, 'flex h-20 items-center justify-between font-display')}>
                <span>Made by fans · Data ODbL · Code AGPL</span>
                {children}
            </div>
        </footer>
    );
}
