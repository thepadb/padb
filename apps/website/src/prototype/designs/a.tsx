// PROTOTYPE (issue #41): design A, "Rail". Bold coloured hero band, card rails, dark header.
import { Link } from '@tanstack/react-router';
import { FilterIcon, SearchIcon } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { countryName, findPark, findResort, type Park, type Resort, type Ride, ridesIn } from '../data';
import { Placeholder } from '../placeholder';
import { PreviewLink } from '../preview-link';
import { SampleForm, useSampleForm } from '../sample-form';
import { NameTable, PartialDate, type ParksList, StatusTable, useParksList } from '../shared';
import { currentStatus, statusLine } from '../status-line';
import { statusName } from '@/lib/status';

const wrap = 'mx-auto w-full max-w-7xl px-4 sm:px-6';

export function Header() {
    return (
        <header className="bg-header text-header-foreground">
            <div className={cn(wrap, 'flex h-14 items-center gap-6')}>
                <Link to="/" className="font-display text-lg font-extrabold tracking-tight">
                    PADB<span className="text-accent">.</span>
                </Link>
                <nav className="flex gap-4 text-sm text-header-foreground/75 [&_a:hover]:text-header-foreground [&_a.active]:text-header-foreground">
                    <Link to="/parks">Parks</Link>
                    <Link to="/resorts/$resort" params={{ resort: 'lakeside' }}>
                        Resorts
                    </Link>
                    <Link to="/parks/new">Suggest a Park</Link>
                </nav>
                <div className="ml-auto hidden h-9 w-64 items-center gap-2 rounded-md bg-white/10 px-3 text-sm text-header-foreground/60 md:flex">
                    <SearchIcon className="size-4" /> Search parks and rides
                </div>
            </div>
        </header>
    );
}

function Hero({ children, image }: { children: React.ReactNode; image?: React.ReactNode }) {
    return (
        <section className="bg-hero text-hero-foreground">
            <div className={cn(wrap, 'grid items-end gap-8 py-10 md:grid-cols-[1fr_20rem] md:py-14')}>
                <div className="min-w-0">{children}</div>
                {image}
            </div>
        </section>
    );
}

function HeroTitle({ children }: { children: string }) {
    return (
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-balance break-words hyphens-auto md:text-6xl">
            {children}
        </h1>
    );
}

function StatusChip({ text }: { text: string | null }) {
    return text ? (
        <p className="mt-4 inline-flex rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground">
            {text}
        </p>
    ) : null;
}

function Rail({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section>
            <h2 className="mb-3 font-display text-xl font-bold">{title}</h2>
            <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6">{children}</div>
        </section>
    );
}

function RailCard({
    kind,
    id,
    name,
    sub,
}: {
    kind: 'park' | 'ride' | 'resort';
    id: string;
    name: string;
    sub?: string | null;
}) {
    return (
        <PreviewLink
            kind={kind}
            id={id}
            className="group w-56 shrink-0 snap-start overflow-hidden rounded-lg border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
            <Placeholder name={name} className="aspect-[4/3] w-full" />
            <div className="p-3">
                <p className="line-clamp-2 font-display font-semibold leading-snug group-hover:text-primary">{name}</p>
                {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
            </div>
        </PreviewLink>
    );
}

function Facts({ rows }: { rows: Array<[string, React.ReactNode]> }) {
    return (
        <aside className="h-fit rounded-lg border bg-card p-5 shadow-sm lg:sticky lg:top-6">
            <h2 className="mb-3 font-display text-sm font-bold tracking-wider text-muted-foreground uppercase">
                Facts
            </h2>
            <dl className="grid gap-3 text-sm">
                {rows.map(([label, value]) => (
                    <div key={label}>
                        <dt className="text-xs text-muted-foreground">{label}</dt>
                        <dd className="font-medium break-words">{value}</dd>
                    </div>
                ))}
            </dl>
        </aside>
    );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-lg border bg-card p-5 shadow-sm">
            <h2 className="mb-3 font-display text-lg font-bold">{title}</h2>
            {children}
        </section>
    );
}

const opened = (park: Park | Ride) => park.statusHistory.find(entry => entry.status === 'operating')?.began ?? null;

export function ParkPage({ park }: { park: Park }) {
    const resort = park.resort ? findResort(park.resort) : undefined;
    const rides = ridesIn(park.id);
    const status = currentStatus(park.statusHistory);
    return (
        <main>
            <Hero
                image={<Placeholder name={park.name} className="aspect-[4/3] w-full rounded-xl ring-4 ring-white/15" />}
            >
                <p className="mb-2 text-sm text-hero-foreground/75">
                    {resort ? (
                        <>
                            Part of{' '}
                            <PreviewLink kind="resort" id={resort.id} className="underline underline-offset-2">
                                {resort.name}
                            </PreviewLink>{' '}
                            ·{' '}
                        </>
                    ) : null}
                    {countryName(park.country)}
                </p>
                <HeroTitle>{park.name}</HeroTitle>
                <StatusChip text={statusLine(park.statusHistory)} />
            </Hero>
            <div className={cn(wrap, 'grid gap-8 py-8 lg:grid-cols-[1fr_18rem]')}>
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8">
                    {rides.length > 0 && (
                        <Rail title={`Rides (${rides.length})`}>
                            {rides.map(ride => (
                                <RailCard
                                    key={ride.id}
                                    kind="ride"
                                    id={ride.id}
                                    name={ride.name}
                                    sub={`${ride.category} · ${ride.manufacturer}`}
                                />
                            ))}
                        </Rail>
                    )}
                    <Panel title={`Areas (${park.areas.length})`}>
                        {park.areas.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No Areas yet.</p>
                        ) : (
                            <ul className="flex flex-wrap gap-2">
                                {park.areas.map(area => (
                                    <li
                                        key={area}
                                        className="rounded-md bg-secondary px-2.5 py-1 text-sm text-secondary-foreground"
                                    >
                                        {area}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                    <div className="grid gap-8 md:grid-cols-2">
                        <Panel title="Status History">
                            <StatusTable rows={park.statusHistory} />
                        </Panel>
                        <Panel title="Name History">
                            <NameTable rows={park.nameHistory} />
                        </Panel>
                    </div>
                </div>
                <Facts
                    rows={[
                        ['Country', countryName(park.country)],
                        ...(resort ? [['Resort', resort.name] as [string, string]] : []),
                        ['Operator', park.operator],
                        ['Status', status ? statusName(status) : '-'],
                        ['Opened', <PartialDate key="o" value={opened(park)} />],
                        ['Areas', park.areas.length],
                        ...(park.website
                            ? [
                                  [
                                      'Website',
                                      <a key="w" className="text-primary underline" href={park.website}>
                                          {new URL(park.website).host}
                                      </a>,
                                  ] as [string, React.ReactNode],
                              ]
                            : []),
                    ]}
                />
            </div>
        </main>
    );
}

function CountryList({ list, className }: { list: ParksList; className?: string }) {
    const item = (active: boolean) =>
        cn(
            'flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm hover:bg-muted',
            active && 'bg-primary text-primary-foreground hover:bg-primary',
        );
    return (
        <ul className={cn('grid gap-0.5', className)}>
            <li>
                <button type="button" className={item(!list.country)} onClick={() => list.setCountry(undefined)}>
                    All countries
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
                        <span className="tabular text-xs opacity-70">{country.count}</span>
                    </button>
                </li>
            ))}
        </ul>
    );
}

export function ParksPage() {
    const list = useParksList();
    return (
        <main>
            <section className="bg-hero text-hero-foreground">
                <div className={cn(wrap, 'py-10')}>
                    <h1 className="font-display text-5xl font-extrabold tracking-tight">Parks</h1>
                    <p className="mt-2 text-hero-foreground/80">
                        {list.total} {list.country ? `in ${countryName(list.country)}` : 'worldwide'}
                    </p>
                </div>
            </section>
            <div className={cn(wrap, 'grid gap-8 py-8 lg:grid-cols-[14rem_1fr]')}>
                <aside className="hidden lg:block">
                    <h2 className="mb-2 px-3 font-display text-sm font-bold tracking-wider text-muted-foreground uppercase">
                        Country
                    </h2>
                    <CountryList list={list} />
                </aside>
                <div>
                    <div className="mb-4 lg:hidden">
                        <Sheet
                            title="Country"
                            trigger={
                                <Button variant="outline">
                                    <FilterIcon className="size-4" />{' '}
                                    {list.country ? countryName(list.country) : 'Filter'}
                                </Button>
                            }
                        >
                            <CountryList list={list} />
                        </Sheet>
                    </div>
                    <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {list.parks.map(park => (
                            <li key={park.id}>
                                <PreviewLink
                                    kind="park"
                                    id={park.id}
                                    className="group block h-full overflow-hidden rounded-lg border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                >
                                    <Placeholder name={park.name} className="aspect-[16/9] w-full" />
                                    <div className="p-4">
                                        <p className="line-clamp-2 font-display text-lg font-bold leading-snug group-hover:text-primary">
                                            {park.name}
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {countryName(park.country)}
                                        </p>
                                        {statusLine(park.statusHistory) && (
                                            <p className="mt-2 text-xs font-medium">{statusLine(park.statusHistory)}</p>
                                        )}
                                    </div>
                                </PreviewLink>
                            </li>
                        ))}
                    </ul>
                    {list.hasMore && (
                        <div className="mt-8 flex justify-center">
                            <Button size="lg" onClick={list.loadMore}>
                                Load more
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
    const others = ridesIn(ride.park).filter(other => other.id !== ride.id);
    return (
        <main>
            <Hero
                image={<Placeholder name={ride.name} className="aspect-[4/3] w-full rounded-xl ring-4 ring-white/15" />}
            >
                <p className="mb-2 text-sm text-hero-foreground/75">
                    {ride.category} at{' '}
                    {park && (
                        <PreviewLink kind="park" id={park.id} className="underline underline-offset-2">
                            {park.name}
                        </PreviewLink>
                    )}
                </p>
                <HeroTitle>{ride.name}</HeroTitle>
                <StatusChip text={statusLine(ride.statusHistory)} />
            </Hero>
            <div className={cn(wrap, 'grid gap-8 py-8 lg:grid-cols-[1fr_18rem]')}>
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8">
                    <div className="grid gap-8 md:grid-cols-2">
                        <Panel title="Status History">
                            <StatusTable rows={ride.statusHistory} />
                        </Panel>
                        <Panel title="Name History">
                            <NameTable rows={ride.nameHistory} />
                        </Panel>
                    </div>
                    {others.length > 0 && park && (
                        <Rail title={`More at ${park.name}`}>
                            {others.map(other => (
                                <RailCard
                                    key={other.id}
                                    kind="ride"
                                    id={other.id}
                                    name={other.name}
                                    sub={other.category}
                                />
                            ))}
                        </Rail>
                    )}
                </div>
                <Facts
                    rows={[
                        ['Park', park?.name ?? '-'],
                        ['Area', ride.area ?? '-'],
                        ['Category', ride.category],
                        ['Manufacturer', ride.manufacturer],
                        ['Ride Model', ride.model ?? '-'],
                        ['Height', ride.heightM ? `${ride.heightM} m` : '-'],
                        ['Top speed', ride.speedKmh ? `${ride.speedKmh} km/h` : '-'],
                        ['Opened', <PartialDate key="o" value={opened(ride)} />],
                    ]}
                />
            </div>
        </main>
    );
}

export function ResortPage({ resort }: { resort: Resort }) {
    return (
        <main>
            <Hero
                image={
                    <Placeholder name={resort.name} className="aspect-[4/3] w-full rounded-xl ring-4 ring-white/15" />
                }
            >
                <p className="mb-2 text-sm text-hero-foreground/75">Resort · {countryName(resort.country)}</p>
                <HeroTitle>{resort.name}</HeroTitle>
                <p className="mt-4 text-hero-foreground/80">
                    {resort.parks.length} {resort.parks.length === 1 ? 'Park' : 'Parks'} and {resort.hotels.length}{' '}
                    {resort.hotels.length === 1 ? 'Hotel' : 'Hotels'}
                </p>
            </Hero>
            <div className={cn(wrap, 'grid gap-8 py-8 lg:grid-cols-[1fr_18rem]')}>
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8">
                    <Rail title="Parks">
                        {resort.parks.map(id => {
                            const park = findPark(id);
                            return park ? (
                                <RailCard
                                    key={id}
                                    kind="park"
                                    id={id}
                                    name={park.name}
                                    sub={statusLine(park.statusHistory)}
                                />
                            ) : null;
                        })}
                    </Rail>
                    <Panel title="Hotels">
                        <ul className="grid gap-3 sm:grid-cols-3">
                            {resort.hotels.map(hotel => (
                                <li key={hotel.name} className="flex items-center gap-3">
                                    <Placeholder name={hotel.name} className="size-12 rounded-md" />
                                    <div>
                                        <p className="font-medium">{hotel.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Opened <PartialDate value={hotel.opened} />
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Panel>
                    <Panel title="Name History">
                        <NameTable rows={resort.nameHistory} />
                    </Panel>
                </div>
                <Facts
                    rows={[
                        ['Country', countryName(resort.country)],
                        ['Operator', resort.operator],
                        ['Parks', resort.parks.length],
                        ['Hotels', resort.hotels.length],
                    ]}
                />
            </div>
        </main>
    );
}

export function FormPage() {
    const state = useSampleForm();
    return (
        <main>
            <section className="bg-hero text-hero-foreground">
                <div className={cn(wrap, 'py-10')}>
                    <h1 className="font-display text-4xl font-extrabold tracking-tight">Suggest a Park</h1>
                    <p className="mt-2 text-hero-foreground/80">
                        A Moderator reviews every suggestion before it appears.
                    </p>
                </div>
            </section>
            <div className={cn(wrap, 'py-8')}>
                <div className="max-w-2xl rounded-lg border bg-card p-6 shadow-sm">
                    <SampleForm
                        state={state}
                        actions={
                            <div className="flex gap-3">
                                <Button type="submit">Submit suggestion</Button>
                                <Button type="button" variant="ghost" onClick={state.showErrors}>
                                    Show error states
                                </Button>
                            </div>
                        }
                    />
                </div>
            </div>
        </main>
    );
}

export function Footer({ children }: { children: React.ReactNode }) {
    return (
        <footer className="mt-12 bg-header text-header-foreground/70">
            <div className={cn(wrap, 'flex h-16 items-center justify-between text-sm')}>
                <span>Data ODbL · Code AGPL</span>
                {children}
            </div>
        </footer>
    );
}
