// PROTOTYPE (issue #41): design F, "Workbench". A tool for people who browse and edit: a tree of
// Countries, Destinations, Parks and Rides always to hand, one sheet of detail beside it, every fact
// editable in place. The browser is in f-browse.tsx, the editable facts in f-facts.tsx.
import { Link, useSearch } from '@tanstack/react-router';
import { ChevronRightIcon, LayoutGridIcon, ListTreeIcon, PlusIcon, SearchIcon, XIcon } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { inputClasses } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
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
import { Browser, type Current, SearchDrawer } from './f-browse';
import { type Fact, FactRow, NameHistoryTable, NameRow, StatusHistoryTable, StatusRow, usePending } from './f-facts';
import { openedOf, PartialDate, StatusDot, useParksList } from '../shared';
import { currentStatus, statusLine } from '../status-line';

const link = 'text-primary hover:underline';
const h2 = 'text-sm font-semibold';

export function Header() {
    return (
        <header className="border-b bg-card">
            <div className="flex h-12 items-center justify-between gap-6 px-4">
                <Link to="/" className="font-semibold">
                    PADB
                </Link>
                <nav className="hidden gap-1 text-sm lg:flex [&_a]:rounded-md [&_a]:px-2.5 [&_a]:py-1 [&_a:hover]:bg-muted [&_a.active]:bg-secondary [&_a.active]:text-secondary-foreground">
                    <Link to="/parks">Parks</Link>
                    <Link to="/resorts/$resort" params={{ resort: 'lakeside' }}>
                        Resorts
                    </Link>
                    <Link to="/parks/new">New Park</Link>
                </nav>
            </div>
        </header>
    );
}

function Shell({ current, children }: { current: Current; children: React.ReactNode }) {
    return (
        <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
            <aside className="hidden border-r lg:block">
                <div className="sticky top-0 max-h-dvh overflow-y-auto">
                    <Browser current={current} />
                </div>
            </aside>
            <div className="min-w-0 p-2 sm:p-4">
                <main className="rounded-lg border bg-card px-4 py-5 sm:px-8 sm:py-7">{children}</main>
            </div>
            <MobileNav current={current} />
        </div>
    );
}

const tab =
    'flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground [&.active]:text-primary [&_svg]:size-5';

/** Mobile only: the nav moves to the bottom, in thumb reach. */
function MobileNav({ current }: { current: Current }) {
    return (
        <nav
            aria-label="Main"
            className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
            <Sheet
                title="Browse"
                trigger={
                    <button type="button" className={tab}>
                        <ListTreeIcon aria-hidden="true" />
                        Browse
                    </button>
                }
            >
                <Browser current={current} searchable={false} />
            </Sheet>
            <SearchDrawer
                trigger={
                    <button type="button" className={tab}>
                        <SearchIcon aria-hidden="true" />
                        Search
                    </button>
                }
            />
            <Link to="/parks" className={tab}>
                <LayoutGridIcon aria-hidden="true" />
                Parks
            </Link>
            <Link to="/parks/new" className={tab}>
                <PlusIcon aria-hidden="true" />
                New Park
            </Link>
        </nav>
    );
}

function Crumbs({ items }: { items: Array<React.ReactNode> }) {
    return (
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-1">
                {items.map((item, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: a fixed trail
                    <li key={i} className="flex items-center gap-1">
                        {i > 0 && <ChevronRightIcon aria-hidden="true" className="size-3.5" />}
                        {item}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

function Head({ name, line, crumbs }: { name: string; line?: string | null; crumbs: Array<React.ReactNode> }) {
    return (
        <div className="mb-8">
            <Crumbs items={crumbs} />
            <h1 className="text-2xl leading-tight font-semibold text-balance break-words hyphens-auto sm:text-3xl">
                {name}
            </h1>
            {line && <p className="mt-1.5 text-muted-foreground">{line}</p>}
        </div>
    );
}

function Section({
    id,
    title,
    count,
    action,
    children,
}: {
    id?: string;
    title: string;
    count?: number;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section id={id} className="scroll-mt-4 border-t pt-4 pb-8">
            <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className={h2}>
                    {title}
                    {count !== undefined && <span className="ml-1.5 font-normal text-muted-foreground">{count}</span>}
                </h2>
                {action}
            </div>
            {children}
        </section>
    );
}

type Record = { name: string; status?: Array<StatusEntry>; names: Array<NameEntry> } & ReturnType<typeof usePending>;

function Detail({ record, facts, children }: { record: Record; facts: Array<Fact>; children: React.ReactNode }) {
    return (
        <div className="grid gap-x-10 xl:grid-cols-[minmax(0,1fr)_15rem]">
            <div className="min-w-0">
                <Section title="Details">
                    <dl>
                        <NameRow name={record.name} pending={record.pending} suggest={record.suggest} />
                        {record.status && (
                            <StatusRow history={record.status} pending={record.pending} suggest={record.suggest} />
                        )}
                        {facts.map(fact => (
                            <FactRow key={fact.label} fact={fact} />
                        ))}
                    </dl>
                </Section>
                {children}
            </div>
            <aside className="order-first mb-6 xl:order-none">
                <Placeholder
                    name={record.name}
                    className="aspect-[3/1] w-full rounded-md sm:aspect-[16/9] xl:aspect-square"
                />
                <Button variant="ghost" size="sm" className="mt-1 w-full">
                    Add a photo
                </Button>
            </aside>
        </div>
    );
}

function Histories({ record }: { record: Record }) {
    const add = (label: string) => (
        <Button variant="outline" size="sm">
            {label}
        </Button>
    );
    return (
        <div className="grid gap-x-8 md:grid-cols-2">
            {record.status && (
                <Section title="Status History" count={record.status.length} action={add('Add Status')}>
                    <StatusHistoryTable rows={record.status} pending={record.pending} />
                </Section>
            )}
            <Section title="Name History" count={record.names.length} action={add('Add name')}>
                <NameHistoryTable rows={record.names} pending={record.pending} />
            </Section>
        </div>
    );
}

const grid =
    'w-full text-[13px] [&_td]:border-t [&_td]:py-1.5 [&_td]:pr-4 [&_th]:pb-1.5 [&_th]:pr-4 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr:hover]:bg-muted';

const StatusCell = ({ history }: { history: Array<StatusEntry> }) => {
    const status = currentStatus(history);
    return (
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <StatusDot status={status} className="size-2" />
            {status ? statusName(status) : 'Not recorded'}
        </span>
    );
};

export function ParkPage({ park }: { park: Park }) {
    const resort = park.resort ? findResort(park.resort) : undefined;
    const rides = ridesIn(park.id);
    const record = { name: park.name, status: park.statusHistory, names: park.nameHistory, ...usePending() };
    return (
        <Shell current={{ country: park.country, resort: park.resort, park: park.id }}>
            <Head
                name={park.name}
                line={statusLine(park.statusHistory)}
                crumbs={[
                    <Link key="p" to="/parks" className={link}>
                        Parks
                    </Link>,
                    <Link key="c" to="/parks" search={{ country: park.country }} className={link}>
                        {countryName(park.country)}
                    </Link>,
                    resort && (
                        <PreviewLink key="r" kind="resort" id={resort.id} className={link}>
                            {resort.name}
                        </PreviewLink>
                    ),
                ].filter(Boolean)}
            />
            <Detail
                record={record}
                facts={[
                    { label: 'Country', value: countryName(park.country), raw: countryName(park.country) },
                    { label: 'Operator', value: park.operator, raw: park.operator },
                    {
                        label: 'Resort',
                        value: resort ? (
                            <PreviewLink kind="resort" id={resort.id} className={link}>
                                {resort.name}
                            </PreviewLink>
                        ) : (
                            <span className="text-muted-foreground">None</span>
                        ),
                    },
                    { label: 'Opened', value: <PartialDate value={openedOf(park.statusHistory)} /> },
                    {
                        label: 'Website',
                        value: park.website ? (
                            <a className={link} href={park.website}>
                                {new URL(park.website).host}
                            </a>
                        ) : (
                            <span className="text-muted-foreground">None</span>
                        ),
                        raw: park.website ?? '',
                    },
                ]}
            >
                <Section
                    title="Rides"
                    count={rides.length}
                    action={
                        <Button variant="outline" size="sm">
                            Add Ride
                        </Button>
                    }
                >
                    {rides.length ? (
                        <div className="overflow-x-auto">
                            <table className={grid}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Category</th>
                                        <th className="hidden sm:table-cell">Area</th>
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
                                            <td className="hidden sm:table-cell">{ride.area ?? '-'}</td>
                                            <td>
                                                <StatusCell history={ride.statusHistory} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No Rides yet. Add the first one.</p>
                    )}
                </Section>
                <Section
                    title="Areas"
                    count={park.areas.length}
                    action={
                        <Button variant="outline" size="sm">
                            Add Area
                        </Button>
                    }
                >
                    {park.areas.length ? (
                        <ul className="flex flex-wrap gap-1.5">
                            {park.areas.map(area => (
                                <li key={area} className="rounded-md border bg-muted px-2 py-0.5 text-[13px]">
                                    {area}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">No Areas yet.</p>
                    )}
                </Section>
                <Histories record={record} />
            </Detail>
        </Shell>
    );
}

export function ParksPage() {
    const list = useParksList();
    const { country } = useSearch({ strict: false }) as { country?: string };
    return (
        <Shell current={{ country }}>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">Parks</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {list.total} {list.total === 1 ? 'Park' : 'Parks'}
                        {list.country && (
                            <>
                                {' in '}
                                <span className="inline-flex items-center gap-1 rounded-md bg-accent px-1.5 text-accent-foreground">
                                    {countryName(list.country)}
                                    <button
                                        type="button"
                                        onClick={() => list.setCountry(undefined)}
                                        aria-label="Show every country"
                                        className="rounded hover:bg-foreground/10"
                                    >
                                        <XIcon className="size-3.5" />
                                    </button>
                                </span>
                            </>
                        )}
                    </p>
                </div>
                <input
                    type="search"
                    value={list.query}
                    onChange={event => list.setQuery(event.target.value)}
                    placeholder="Filter by name"
                    aria-label="Filter Parks by name"
                    className={cn(inputClasses, 'w-full sm:w-64')}
                />
            </div>
            {list.parks.length ? (
                <ul className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                    {list.parks.map(park => (
                        <li key={park.id}>
                            <Link
                                to="/parks/$park"
                                params={{ park: park.id }}
                                className="flex h-full gap-3 rounded-md border p-2 hover:border-primary hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                                <Placeholder name={park.name} className="size-16 shrink-0 rounded" />
                                <span className="min-w-0 text-sm">
                                    <span className="block font-medium leading-snug break-words">{park.name}</span>
                                    <span className="block text-muted-foreground">{countryName(park.country)}</span>
                                    <span className="mt-0.5 block text-muted-foreground">
                                        <StatusCell history={park.statusHistory} />
                                    </span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground">No Parks match. Clear the filter or add one.</p>
            )}
            {list.hasMore && (
                <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
                    <Button variant="outline" onClick={list.loadMore}>
                        Load more
                    </Button>
                    {list.parks.length} of {list.total}
                </div>
            )}
        </Shell>
    );
}

export function RidePage({ ride }: { ride: Ride }) {
    const park = findPark(ride.park);
    const record = { name: ride.name, status: ride.statusHistory, names: ride.nameHistory, ...usePending() };
    return (
        <Shell current={{ country: park?.country, park: park?.id, ride: ride.id }}>
            <Head
                name={ride.name}
                line={statusLine(ride.statusHistory)}
                crumbs={[
                    <Link key="p" to="/parks" className={link}>
                        Parks
                    </Link>,
                    park && (
                        <PreviewLink key="k" kind="park" id={park.id} className={link}>
                            {park.name}
                        </PreviewLink>
                    ),
                ].filter(Boolean)}
            />
            <Detail
                record={record}
                facts={[
                    {
                        label: 'Park',
                        value: park ? (
                            <PreviewLink kind="park" id={park.id} className={link}>
                                {park.name}
                            </PreviewLink>
                        ) : (
                            'Not recorded'
                        ),
                    },
                    { label: 'Area', value: ride.area ?? 'Not recorded', raw: ride.area ?? '' },
                    { label: 'Category', value: ride.category, raw: ride.category },
                    { label: 'Manufacturer', value: ride.manufacturer, raw: ride.manufacturer },
                    { label: 'Ride Model', value: ride.model ?? 'None', raw: ride.model ?? '' },
                    {
                        label: 'Height',
                        value: ride.heightM ? `${ride.heightM} m` : 'Not recorded',
                        raw: ride.heightM ? String(ride.heightM) : '',
                    },
                    {
                        label: 'Top speed',
                        value: ride.speedKmh ? `${ride.speedKmh} km/h` : 'Not recorded',
                        raw: ride.speedKmh ? String(ride.speedKmh) : '',
                    },
                ]}
            >
                <Histories record={record} />
            </Detail>
        </Shell>
    );
}

export function ResortPage({ resort }: { resort: Resort }) {
    const record = { name: resort.name, names: resort.nameHistory, ...usePending() };
    return (
        <Shell current={{ country: resort.country, resort: resort.id }}>
            <Head
                name={resort.name}
                crumbs={[
                    <span key="r">Resorts</span>,
                    <Link key="c" to="/parks" search={{ country: resort.country }} className={link}>
                        {countryName(resort.country)}
                    </Link>,
                ]}
            />
            <Detail
                record={record}
                facts={[
                    { label: 'Country', value: countryName(resort.country), raw: countryName(resort.country) },
                    { label: 'Operator', value: resort.operator, raw: resort.operator },
                ]}
            >
                <Section title="Parks" count={resort.parks.length}>
                    <table className={grid}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Status</th>
                                <th className="hidden sm:table-cell">Opened</th>
                            </tr>
                        </thead>
                        <tbody>
                            {resort.parks.map(findPark).map(park =>
                                park ? (
                                    <tr key={park.id}>
                                        <td>
                                            <PreviewLink kind="park" id={park.id} className={link}>
                                                {park.name}
                                            </PreviewLink>
                                        </td>
                                        <td>
                                            <StatusCell history={park.statusHistory} />
                                        </td>
                                        <td className="hidden sm:table-cell">
                                            <PartialDate value={openedOf(park.statusHistory)} />
                                        </td>
                                    </tr>
                                ) : null,
                            )}
                        </tbody>
                    </table>
                </Section>
                <Section id="hotels" title="Hotels" count={resort.hotels.length}>
                    <table className={grid}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Opened</th>
                            </tr>
                        </thead>
                        <tbody>
                            {resort.hotels.map(hotel => (
                                <tr key={hotel.name}>
                                    <td>{hotel.name}</td>
                                    <td>
                                        <PartialDate value={hotel.opened} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Section>
                <Histories record={record} />
            </Detail>
        </Shell>
    );
}

export function FormPage() {
    const state = useSampleForm();
    return (
        <Shell current={{}}>
            <Head
                name="New Park"
                line="A Moderator checks every new Park before it’s published."
                crumbs={[
                    <Link key="p" to="/parks" className={link}>
                        Parks
                    </Link>,
                ]}
            />
            <SampleForm
                state={state}
                className="max-w-xl"
                actions={
                    <div className="flex flex-wrap gap-2 border-t pt-4">
                        <Button type="submit">Create Park</Button>
                        <Button type="button" variant="outline" onClick={state.showErrors}>
                            Show error states
                        </Button>
                    </div>
                }
            />
        </Shell>
    );
}

export function Footer({ children }: { children: React.ReactNode }) {
    return (
        <footer className="border-t bg-card">
            <div className="max-lg:pb-20 flex flex-wrap justify-between gap-4 px-4 py-3 text-xs text-muted-foreground">
                <span>Data ODbL 1.0, code AGPL-3.0.</span>
                {children}
            </div>
        </footer>
    );
}
