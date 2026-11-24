// PROTOTYPE (issue #41): design B, "Register". Formal: each page is a record in a heritage register,
// with its particulars beside tabbed sections, and the Parks list as a sortable register.
import { Tabs } from '@base-ui/react/tabs';
import { Link } from '@tanstack/react-router';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { statusName } from '@/lib/status';
import { cn } from '@/lib/utils';
import { countryName, findPark, findResort, type Park, type Resort, type Ride, ridesIn } from '../data';
import { Placeholder } from '../placeholder';
import { PreviewLink } from '../preview-link';
import { SampleForm, useSampleForm } from '../sample-form';
import {
    NameTable,
    openedOf,
    PartialDate,
    type ParksList,
    type SortKey,
    StatusDot,
    StatusTable,
    useParksList,
} from '../shared';
import { currentStatus, statusLine } from '../status-line';

const wrap = 'mx-auto w-full max-w-6xl px-4 sm:px-8';
const link = 'text-primary underline decoration-primary/40 underline-offset-[3px] hover:decoration-primary';

/** A stable, ID-like reference for the fake records; real records show their UUIDv7. See ADR 0008 */
const reference = (id: string) => {
    let h = 2166136261;
    for (const char of id) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
    const hex = (h >>> 0).toString(16).padStart(8, '0');
    return `0193${hex.slice(0, 4)}-${hex.slice(4)}-7…`;
};

export function Header() {
    return (
        <header className="bg-primary text-primary-foreground dark:bg-secondary dark:text-secondary-foreground">
            <div className={cn(wrap, 'flex flex-wrap items-center justify-between gap-x-8 gap-y-2 py-4')}>
                <Link to="/" className="font-display text-xl leading-tight">
                    Parks &amp; Attractions Database
                </Link>
                <nav className="flex gap-6 text-sm opacity-85 [&_a:hover]:underline [&_a.active]:underline [&_a.active]:underline-offset-8">
                    <Link to="/parks">Register of Parks</Link>
                    <Link to="/resorts/$resort" params={{ resort: 'lakeside' }}>
                        Resorts
                    </Link>
                    <Link to="/parks/new">Submit a record</Link>
                </nav>
            </div>
        </header>
    );
}

function RecordHead({
    kind,
    id,
    name,
    line,
    context,
}: {
    kind: string;
    id: string;
    name: string;
    line?: string | null;
    context?: React.ReactNode;
}) {
    return (
        <div className="border-b-2 border-primary pt-10 pb-6">
            <p className="flex flex-wrap justify-between gap-x-6 text-sm text-muted-foreground">
                <span>{kind} record</span>
                <span className="tabular">Record {reference(id)}</span>
            </p>
            <h1 className="mt-3 font-display text-4xl leading-[1.15] text-balance break-words hyphens-auto sm:text-5xl">
                {name}
            </h1>
            {line && <p className="mt-3 font-display text-xl text-muted-foreground italic">{line}</p>}
            {context && <p className="mt-2 text-sm">{context}</p>}
        </div>
    );
}

function Particulars({ name, rows }: { name: string; rows: Array<[string, React.ReactNode]> }) {
    return (
        <aside className="h-fit lg:sticky lg:top-6">
            <figure className="border bg-card p-2">
                <Placeholder name={name} className="aspect-[4/3] w-full rounded-[2px]" />
                <figcaption className="px-1 pt-2 text-xs text-muted-foreground">
                    Photograph wanted. Images will sit here.
                </figcaption>
            </figure>
            <h2 className="mt-6 mb-2 font-display text-lg">Particulars</h2>
            <dl className="text-sm [&>div:nth-child(odd)]:bg-muted">
                {rows.map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[7.5rem_1fr] gap-3 px-2 py-1.5">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="break-words">{value}</dd>
                    </div>
                ))}
            </dl>
        </aside>
    );
}

type Section = { value: string; label: string; content: React.ReactNode };

function Sections({ sections }: { sections: Array<Section> }) {
    return (
        <Tabs.Root defaultValue={sections[0].value} className="min-w-0">
            <Tabs.List className="relative flex gap-1 overflow-x-auto border-b">
                {sections.map(section => (
                    <Tabs.Tab
                        key={section.value}
                        value={section.value}
                        className="shrink-0 px-3 py-2.5 text-sm whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-active:text-foreground"
                    >
                        {section.label}
                    </Tabs.Tab>
                ))}
                <Tabs.Indicator className="absolute bottom-0 left-(--active-tab-left) h-[3px] w-(--active-tab-width) bg-accent transition-all duration-200" />
            </Tabs.List>
            {sections.map(section => (
                <Tabs.Panel key={section.value} value={section.value} className="pt-6 outline-none">
                    {section.content}
                </Tabs.Panel>
            ))}
        </Tabs.Root>
    );
}

function Record({
    head,
    particulars,
    sections,
}: {
    head: React.ReactNode;
    particulars: React.ReactNode;
    sections: Array<Section>;
}) {
    return (
        <main className={wrap}>
            {head}
            <div className="grid gap-10 py-8 lg:grid-cols-[19rem_minmax(0,1fr)]">
                {particulars}
                <Sections sections={sections} />
            </div>
        </main>
    );
}

function RidesTable({ rides }: { rides: Array<Ride> }) {
    return (
        <table className="w-full text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-medium [&_thead]:bg-secondary [&_thead]:text-secondary-foreground [&_tbody_tr:nth-child(even)]:bg-muted">
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
                        <td>
                            <span className="inline-flex items-center gap-2">
                                <StatusDot status={currentStatus(ride.statusHistory)} />
                                {statusName(currentStatus(ride.statusHistory) ?? 'operating')}
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

const none = (text: string) => <p className="text-muted-foreground italic">{text}</p>;

export function ParkPage({ park }: { park: Park }) {
    const resort = park.resort ? findResort(park.resort) : undefined;
    const rides = ridesIn(park.id);
    const status = currentStatus(park.statusHistory);
    return (
        <Record
            head={
                <RecordHead
                    kind="Park"
                    id={park.id}
                    name={park.name}
                    line={statusLine(park.statusHistory)}
                    context={
                        resort && (
                            <>
                                Part of{' '}
                                <PreviewLink kind="resort" id={resort.id} className={link}>
                                    {resort.name}
                                </PreviewLink>
                            </>
                        )
                    }
                />
            }
            particulars={
                <Particulars
                    name={park.name}
                    rows={[
                        ['Country', countryName(park.country)],
                        ['Resort', resort?.name ?? 'None'],
                        ['Operator', park.operator],
                        ['Status', status ? statusName(status) : 'Not recorded'],
                        ['Opened', <PartialDate key="o" value={openedOf(park.statusHistory)} />],
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
            sections={[
                {
                    value: 'rides',
                    label: `Rides (${rides.length})`,
                    content: rides.length ? <RidesTable rides={rides} /> : none('No Rides recorded yet.'),
                },
                {
                    value: 'areas',
                    label: `Areas (${park.areas.length})`,
                    content: park.areas.length ? (
                        <ul className="columns-2 gap-8 sm:columns-3 [&>li]:border-b [&>li]:py-1.5">
                            {park.areas.map(area => (
                                <li key={area} className="break-inside-avoid">
                                    {area}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        none('No Areas recorded yet.')
                    ),
                },
                {
                    value: 'status',
                    label: 'Status History',
                    content: <StatusTable rows={park.statusHistory} className="max-w-lg" />,
                },
                {
                    value: 'names',
                    label: 'Name History',
                    content: <NameTable rows={park.nameHistory} className="max-w-lg" />,
                },
            ]}
        />
    );
}

function CountryFilter({ list }: { list: ParksList }) {
    const item = (active: boolean) =>
        cn(
            'flex w-full justify-between rounded-[3px] px-2 py-1.5 text-left text-sm hover:bg-muted',
            active && 'bg-secondary font-medium text-secondary-foreground hover:bg-secondary',
        );
    return (
        <fieldset>
            <legend className="mb-2 font-display text-lg">Country</legend>
            <ul>
                <li>
                    <button
                        type="button"
                        className={item(!list.country)}
                        onClick={() => list.setCountry(undefined)}
                        aria-pressed={!list.country}
                    >
                        All countries
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
                            <span className="tabular text-muted-foreground">{country.count}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </fieldset>
    );
}

function SortHeader({
    list,
    by,
    children,
    className,
}: {
    list: ParksList;
    by: SortKey;
    children: string;
    className?: string;
}) {
    const active = list.sort.key === by;
    const Icon = active && list.sort.descending ? ArrowDownIcon : ArrowUpIcon;
    return (
        <th className={className} aria-sort={active ? (list.sort.descending ? 'descending' : 'ascending') : undefined}>
            <button
                type="button"
                onClick={() => list.sortBy(by)}
                className="inline-flex items-center gap-1 font-medium hover:underline"
            >
                {children}
                <Icon className={cn('size-3.5', !active && 'opacity-0')} />
            </button>
        </th>
    );
}

export function ParksPage() {
    const list = useParksList();
    return (
        <main className={wrap}>
            <div className="border-b-2 border-primary pt-10 pb-6">
                <h1 className="font-display text-5xl">Register of Parks</h1>
                <p className="mt-3 font-display text-xl text-muted-foreground italic">
                    {list.total} {list.total === 1 ? 'record' : 'records'}
                    {list.country ? ` in ${countryName(list.country)}` : ', all countries'}
                </p>
            </div>
            <div className="grid gap-10 py-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
                <aside className="hidden lg:block">
                    <CountryFilter list={list} />
                </aside>
                <div className="min-w-0">
                    <div className="mb-4 lg:hidden">
                        <Sheet
                            title="Filter the register"
                            trigger={
                                <Button variant="outline">
                                    Country: {list.country ? countryName(list.country) : 'All'}
                                </Button>
                            }
                        >
                            <CountryFilter list={list} />
                        </Sheet>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_thead]:bg-secondary [&_thead]:text-secondary-foreground [&_tbody_tr:nth-child(even)]:bg-muted [&_tbody_tr:hover]:bg-secondary/60">
                            <thead>
                                <tr>
                                    <th className="w-16">
                                        <span className="sr-only">Photograph</span>
                                    </th>
                                    <SortHeader list={list} by="name">
                                        Name
                                    </SortHeader>
                                    <SortHeader list={list} by="country" className="hidden md:table-cell">
                                        Country
                                    </SortHeader>
                                    <SortHeader list={list} by="status">
                                        Status
                                    </SortHeader>
                                    <SortHeader list={list} by="opened" className="hidden sm:table-cell">
                                        Opened
                                    </SortHeader>
                                </tr>
                            </thead>
                            <tbody>
                                {list.parks.map(park => {
                                    const status = currentStatus(park.statusHistory);
                                    return (
                                        <tr key={park.id}>
                                            <td>
                                                <Placeholder
                                                    name={park.name}
                                                    className="aspect-[4/3] w-14 rounded-[2px]"
                                                />
                                            </td>
                                            <td className="max-w-[24rem]">
                                                <Link
                                                    to="/parks/$park"
                                                    params={{ park: park.id }}
                                                    className={cn(link, 'font-display text-base')}
                                                >
                                                    {park.name}
                                                </Link>
                                            </td>
                                            <td className="hidden md:table-cell">{countryName(park.country)}</td>
                                            <td>
                                                {status ? (
                                                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                                                        <StatusDot status={status} />
                                                        {statusName(status)}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground italic">Not recorded</span>
                                                )}
                                            </td>
                                            <td className="hidden whitespace-nowrap sm:table-cell">
                                                <PartialDate value={openedOf(park.statusHistory)} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {list.hasMore && (
                        <div className="mt-6 flex items-center justify-between gap-4 text-sm text-muted-foreground">
                            Showing {list.parks.length} of {list.total}
                            <Button variant="outline" onClick={list.loadMore}>
                                Load more records
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
        <Record
            head={
                <RecordHead
                    kind="Ride"
                    id={ride.id}
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
            }
            particulars={
                <Particulars
                    name={ride.name}
                    rows={[
                        ['Park', park?.name ?? 'Not recorded'],
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
            sections={[
                {
                    value: 'status',
                    label: 'Status History',
                    content: <StatusTable rows={ride.statusHistory} className="max-w-lg" />,
                },
                {
                    value: 'names',
                    label: 'Name History',
                    content: <NameTable rows={ride.nameHistory} className="max-w-lg" />,
                },
            ]}
        />
    );
}

export function ResortPage({ resort }: { resort: Resort }) {
    return (
        <Record
            head={
                <RecordHead
                    kind="Resort"
                    id={resort.id}
                    name={resort.name}
                    context={`${countryName(resort.country)}, run by ${resort.operator}`}
                />
            }
            particulars={
                <Particulars
                    name={resort.name}
                    rows={[
                        ['Country', countryName(resort.country)],
                        ['Operator', resort.operator],
                        ['Parks', resort.parks.length],
                        ['Hotels', resort.hotels.length],
                    ]}
                />
            }
            sections={[
                {
                    value: 'parks',
                    label: `Parks (${resort.parks.length})`,
                    content: (
                        <ul className="[&>li:nth-child(odd)]:bg-muted">
                            {resort.parks.map(id => {
                                const park = findPark(id);
                                return park ? (
                                    <li
                                        key={id}
                                        className="flex flex-wrap items-center justify-between gap-x-4 px-3 py-2"
                                    >
                                        <PreviewLink kind="park" id={id} className={cn(link, 'font-display text-base')}>
                                            {park.name}
                                        </PreviewLink>
                                        <span className="text-sm text-muted-foreground">
                                            {statusLine(park.statusHistory)}
                                        </span>
                                    </li>
                                ) : null;
                            })}
                        </ul>
                    ),
                },
                {
                    value: 'hotels',
                    label: `Hotels (${resort.hotels.length})`,
                    content: (
                        <ul className="[&>li:nth-child(odd)]:bg-muted">
                            {resort.hotels.map(hotel => (
                                <li key={hotel.name} className="flex justify-between gap-4 px-3 py-2 text-sm">
                                    {hotel.name}
                                    <span>
                                        Opened <PartialDate value={hotel.opened} />
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ),
                },
                {
                    value: 'names',
                    label: 'Name History',
                    content: <NameTable rows={resort.nameHistory} className="max-w-lg" />,
                },
            ]}
        />
    );
}

export function FormPage() {
    const state = useSampleForm();
    return (
        <main className={cn(wrap, 'max-w-3xl')}>
            <div className="border-b-2 border-primary pt-10 pb-6">
                <h1 className="font-display text-4xl">Submit a Park record</h1>
                <p className="mt-3 font-display text-lg text-muted-foreground italic">
                    Records are checked by a Moderator before they enter the register.
                </p>
            </div>
            <div className="my-8 border bg-card p-6 sm:p-8">
                <SampleForm
                    state={state}
                    actions={
                        <div className="flex flex-wrap items-center gap-4 border-t pt-6">
                            <Button type="submit">Submit record</Button>
                            <Button type="button" variant="outline" onClick={state.showErrors}>
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
        <footer className="mt-16 border-t-2 border-primary">
            <div className={cn(wrap, 'flex flex-wrap justify-between gap-4 py-8 text-sm text-muted-foreground')}>
                <span>The register’s data is open under ODbL 1.0; its code under AGPL-3.0.</span>
                {children}
            </div>
        </footer>
    );
}
