// PROTOTYPE (issue #41): design B, "Encyclopaedia". Type-led, dense, hairline rules, near-monochrome.
import { Link } from '@tanstack/react-router';
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

const wrap = 'mx-auto w-full max-w-6xl px-4 sm:px-8';
const kicker = 'font-mono text-[0.68rem] font-medium tracking-[0.18em] text-muted-foreground uppercase';
const link = 'underline decoration-border decoration-1 underline-offset-[3px] hover:decoration-foreground';

export function Header() {
    return (
        <header className="border-b">
            <div className={cn(wrap, 'flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 py-4')}>
                <Link to="/" className="text-xl font-semibold tracking-tight [font-variant-caps:small-caps]">
                    Parks &amp; Attractions Database
                </Link>
                <nav className={cn(kicker, 'flex gap-5 [&_a:hover]:text-foreground [&_a.active]:text-foreground')}>
                    <Link to="/parks">Parks</Link>
                    <Link to="/resorts/$resort" params={{ resort: 'lakeside' }}>
                        Resorts
                    </Link>
                    <Link to="/parks/new">Suggest</Link>
                    <span>Search ⌘K</span>
                </nav>
            </div>
        </header>
    );
}

function Title({ kind, name, line }: { kind: string; name: string; line?: React.ReactNode }) {
    return (
        <div className="border-b border-foreground pb-4">
            <p className={kicker}>{kind}</p>
            <h1 className="mt-1 text-4xl leading-tight font-semibold tracking-tight text-balance break-words hyphens-auto md:text-5xl">
                {name}
            </h1>
            {line && <p className="mt-2 text-lg text-muted-foreground italic">{line}</p>}
        </div>
    );
}

function Infobox({ name, rows }: { name: string; rows: Array<[string, React.ReactNode]> }) {
    return (
        <aside className="h-fit border p-3 text-sm lg:sticky lg:top-6">
            <Placeholder name={name} className="aspect-[4/3] w-full" />
            <p className="mt-1.5 mb-3 text-center text-xs text-muted-foreground italic">No photograph yet</p>
            <dl className="grid grid-cols-[7rem_1fr] [&>*]:border-t [&>*]:py-1.5">
                {rows.map(([label, value]) => (
                    <div key={label} className="contents">
                        <dt className="font-mono text-[0.7rem] text-muted-foreground uppercase">{label}</dt>
                        <dd className="break-words">{value}</dd>
                    </div>
                ))}
            </dl>
        </aside>
    );
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
    return (
        <section className={className}>
            <h2 className="mb-2 border-b pb-1 text-xl font-semibold">{title}</h2>
            {children}
        </section>
    );
}

const opened = (thing: Park | Ride) => thing.statusHistory.find(entry => entry.status === 'operating')?.began ?? null;

function Article({ main, aside }: { main: React.ReactNode; aside: React.ReactNode }) {
    return (
        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <div className="grid min-w-0 content-start gap-8">{main}</div>
            {aside}
        </div>
    );
}

export function ParkPage({ park }: { park: Park }) {
    const resort = park.resort ? findResort(park.resort) : undefined;
    const rides = ridesIn(park.id);
    const status = currentStatus(park.statusHistory);
    return (
        <main className={cn(wrap, 'py-8')}>
            <Title
                kind={`Park · ${countryName(park.country)}`}
                name={park.name}
                line={statusLine(park.statusHistory)}
            />
            <Article
                main={
                    <>
                        <p className="text-[1.05rem] leading-relaxed">
                            <b>{park.name}</b> is a Park in {countryName(park.country)}
                            {resort && (
                                <>
                                    , part of{' '}
                                    <PreviewLink kind="resort" id={resort.id} className={link}>
                                        {resort.name}
                                    </PreviewLink>
                                </>
                            )}
                            , run by {park.operator}. It has {park.areas.length} Areas and {rides.length} Rides on
                            record.
                        </p>
                        <Section title="Rides">
                            {rides.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No Rides yet.</p>
                            ) : (
                                <table className="w-full text-sm [&_td]:border-t [&_td]:py-1 [&_td]:pr-3 [&_th]:pb-1 [&_th]:text-left [&_th]:font-mono [&_th]:text-[0.68rem] [&_th]:font-normal [&_th]:tracking-widest [&_th]:text-muted-foreground [&_th]:uppercase">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Category</th>
                                            <th className="hidden sm:table-cell">Manufacturer</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rides.map(ride => (
                                            <tr key={ride.id}>
                                                <td>
                                                    <PreviewLink kind="ride" id={ride.id} className={link}>
                                                        {ride.name}
                                                    </PreviewLink>
                                                </td>
                                                <td>{ride.category}</td>
                                                <td className="hidden sm:table-cell">{ride.manufacturer}</td>
                                                <td className="text-muted-foreground">
                                                    {statusLine(ride.statusHistory)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </Section>
                        <Section title={`Areas (${park.areas.length})`}>
                            {park.areas.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No Areas yet.</p>
                            ) : (
                                <ol className="list-inside list-decimal columns-2 gap-8 text-sm marker:font-mono marker:text-xs marker:text-muted-foreground sm:columns-3 [&>li]:py-0.5">
                                    {park.areas.map(area => (
                                        <li key={area}>{area}</li>
                                    ))}
                                </ol>
                            )}
                        </Section>
                        <div className="grid gap-8 md:grid-cols-2">
                            <Section title="Status History">
                                <StatusTable rows={park.statusHistory} />
                            </Section>
                            <Section title="Name History">
                                <NameTable rows={park.nameHistory} />
                            </Section>
                        </div>
                    </>
                }
                aside={
                    <Infobox
                        name={park.name}
                        rows={[
                            ['Country', countryName(park.country)],
                            ['Resort', resort?.name ?? '-'],
                            ['Operator', park.operator],
                            ['Status', status ? statusName(status) : '-'],
                            ['Opened', <PartialDate key="o" value={opened(park)} />],
                            [
                                'Website',
                                park.website ? (
                                    <a key="w" className={link} href={park.website}>
                                        {new URL(park.website).host}
                                    </a>
                                ) : (
                                    '-'
                                ),
                            ],
                        ]}
                    />
                }
            />
        </main>
    );
}

function CountryList({ list }: { list: ParksList }) {
    const item = (active: boolean) =>
        cn('flex w-full justify-between py-1 text-left hover:underline', active && 'font-semibold');
    return (
        <ul className="divide-y border-y text-sm">
            <li>
                <button type="button" className={item(!list.country)} onClick={() => list.setCountry(undefined)}>
                    All
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
                        <span className="font-mono text-xs text-muted-foreground">{country.count}</span>
                    </button>
                </li>
            ))}
        </ul>
    );
}

export function ParksPage() {
    const list = useParksList();
    return (
        <main className={cn(wrap, 'py-8')}>
            <Title
                kind="Index"
                name="Parks"
                line={`${list.total} ${list.country ? `in ${countryName(list.country)}` : 'on record'}`}
            />
            <div className="mt-6 grid gap-10 lg:grid-cols-[11rem_1fr]">
                <aside className="hidden lg:block">
                    <p className={cn(kicker, 'mb-2')}>Country</p>
                    <CountryList list={list} />
                </aside>
                <div>
                    <div className="mb-4 lg:hidden">
                        <Sheet
                            title="Country"
                            trigger={
                                <Button variant="outline">
                                    Country: {list.country ? countryName(list.country) : 'All'}
                                </Button>
                            }
                        >
                            <CountryList list={list} />
                        </Sheet>
                    </div>
                    <ul className="grid grid-cols-2 gap-px border bg-border sm:grid-cols-3 xl:grid-cols-4">
                        {list.parks.map(park => (
                            <li key={park.id} className="bg-background">
                                <PreviewLink kind="park" id={park.id} className="group block h-full p-3 hover:bg-muted">
                                    <Placeholder name={park.name} className="aspect-[3/2] w-full" />
                                    <p className="mt-2 line-clamp-3 leading-snug font-semibold group-hover:underline">
                                        {park.name}
                                    </p>
                                    <p className="mt-0.5 font-mono text-[0.7rem] text-muted-foreground uppercase">
                                        {countryName(park.country)}
                                    </p>
                                    {statusLine(park.statusHistory) && (
                                        <p className="mt-1 text-xs text-muted-foreground italic">
                                            {statusLine(park.statusHistory)}
                                        </p>
                                    )}
                                </PreviewLink>
                            </li>
                        ))}
                    </ul>
                    {list.hasMore && (
                        <div className="mt-6 border-t pt-4 text-center">
                            <Button variant="link" onClick={list.loadMore}>
                                Load more ↓
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
        <main className={cn(wrap, 'py-8')}>
            <Title kind={`Ride · ${ride.category}`} name={ride.name} line={statusLine(ride.statusHistory)} />
            <Article
                main={
                    <>
                        <p className="text-[1.05rem] leading-relaxed">
                            <b>{ride.name}</b> is a {ride.category.toLowerCase()} Ride
                            {park && (
                                <>
                                    {' '}
                                    at{' '}
                                    <PreviewLink kind="park" id={park.id} className={link}>
                                        {park.name}
                                    </PreviewLink>
                                </>
                            )}
                            , built by {ride.manufacturer}.
                        </p>
                        <div className="grid gap-8 md:grid-cols-2">
                            <Section title="Status History">
                                <StatusTable rows={ride.statusHistory} />
                            </Section>
                            <Section title="Name History">
                                <NameTable rows={ride.nameHistory} />
                            </Section>
                        </div>
                    </>
                }
                aside={
                    <Infobox
                        name={ride.name}
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
                }
            />
        </main>
    );
}

export function ResortPage({ resort }: { resort: Resort }) {
    return (
        <main className={cn(wrap, 'py-8')}>
            <Title kind={`Resort · ${countryName(resort.country)}`} name={resort.name} />
            <Article
                main={
                    <>
                        <p className="text-[1.05rem] leading-relaxed">
                            <b>{resort.name}</b> groups {resort.parks.length}{' '}
                            {resort.parks.length === 1 ? 'Park' : 'Parks'} and {resort.hotels.length}{' '}
                            {resort.hotels.length === 1 ? 'Hotel' : 'Hotels'}, run by {resort.operator}.
                        </p>
                        <Section title="Parks">
                            <ul className="divide-y text-sm">
                                {resort.parks.map(id => {
                                    const park = findPark(id);
                                    return park ? (
                                        <li key={id} className="flex justify-between gap-4 py-1.5">
                                            <PreviewLink kind="park" id={id} className={link}>
                                                {park.name}
                                            </PreviewLink>
                                            <span className="text-muted-foreground italic">
                                                {statusLine(park.statusHistory)}
                                            </span>
                                        </li>
                                    ) : null;
                                })}
                            </ul>
                        </Section>
                        <Section title="Hotels">
                            <ul className="divide-y text-sm">
                                {resort.hotels.map(hotel => (
                                    <li key={hotel.name} className="flex justify-between gap-4 py-1.5">
                                        {hotel.name}
                                        <span className="text-muted-foreground">
                                            Opened <PartialDate value={hotel.opened} />
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </Section>
                        <Section title="Name History">
                            <NameTable rows={resort.nameHistory} />
                        </Section>
                    </>
                }
                aside={
                    <Infobox
                        name={resort.name}
                        rows={[
                            ['Country', countryName(resort.country)],
                            ['Operator', resort.operator],
                            ['Parks', resort.parks.length],
                            ['Hotels', resort.hotels.length],
                        ]}
                    />
                }
            />
        </main>
    );
}

export function FormPage() {
    const state = useSampleForm();
    return (
        <main className={cn(wrap, 'py-8')}>
            <Title
                kind="Contribute"
                name="Suggest a Park"
                line="A Moderator reviews every suggestion before it appears."
            />
            <SampleForm
                state={state}
                className="mt-8 max-w-xl"
                actions={
                    <div className="flex gap-4 border-t pt-4">
                        <Button type="submit">Submit</Button>
                        <Button type="button" variant="link" onClick={state.showErrors}>
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
            <div className={cn(wrap, kicker, 'flex justify-between py-6')}>
                <span>Data ODbL 1.0 · Code AGPL-3.0</span>
                {children}
            </div>
        </footer>
    );
}
