import type { Park, Status } from '@padb/api-client';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { cn } from 'cn';
import { LoaderIcon } from 'lucide-react';
import { useId, useRef } from 'react';
import { Placeholder, StatusName } from '@/components/sheet';
import { pageHeading, quietNote } from '@/components/text';
import { api } from '@/lib/api';
import { countries, flag, isCountry } from '@/lib/country';
import { countryName, parkParam } from '@/lib/park';
import { type Page, useHydrated, usePages } from '@/lib/use-pages';

type Search = { country?: string };

// A customisable select where supported: its picker takes the tokens, and each option its flag. Elsewhere a
// native select, which shows the same text
const countrySelect = cn(
    'h-9 w-full rounded-md border border-input bg-card px-2 sm:w-56',
    '[appearance:base-select] [&::picker(select)]:[appearance:base-select]',
    '[&::picker(select)]:max-h-80 [&::picker(select)]:rounded-md [&::picker(select)]:border [&::picker(select)]:bg-card [&::picker(select)]:text-foreground [&::picker(select)]:shadow-md',
);
const countryOption =
    'flex items-center gap-2 px-2 py-1 hover:bg-muted checked:bg-accent checked:text-accent-foreground';

const buttonClasses = 'flex h-9 items-center gap-2 rounded-md border border-input bg-card px-3 hover:bg-muted';

/** Only what a card shows. */
type ParkCard = Pick<Park, 'id' | 'name' | 'country'> & { status: Status | null };

/** A page of Parks in a country, or every country, oldest first; null when the API cannot give one. */
const getParks = createServerFn({ method: 'GET' })
    .validator((query: { after?: string; country?: string }) => query)
    .handler(async ({ data: query }): Promise<Page<ParkCard> | null> => {
        try {
            const { data } = await api.GET('/v1/parks', { params: { query } });
            return data
                ? {
                      items: data.parks.map(({ id, name, country, status_history }) => ({
                          id,
                          name,
                          country,
                          status: status_history.at(-1)?.status ?? null,
                      })),
                      next: data.next,
                  }
                : null;
        } catch {
            return null;
        }
    });

export const Route = createFileRoute('/parks/')({
    // A country the API would refuse, e.g. from an edited URL, shows every country instead. Set even then,
    // since the router keeps search params a route leaves out
    validateSearch: (search: Record<string, unknown>): Search => ({
        country: typeof search.country === 'string' && isCountry(search.country) ? search.country : undefined,
    }),
    loaderDeps: ({ search }) => ({ country: search.country }),
    loader: async ({ deps }) => {
        const page = await getParks({ data: { country: deps.country } });
        if (!page) {
            throw new Error('The API could not give the Parks list');
        }
        return page;
    },
    head: () => ({ meta: [{ title: 'Parks - Parks & Attractions Database' }] }),
    component: ParksPage,
});

function ParksPage() {
    const { country } = Route.useSearch();
    const firstPage = Route.useLoaderData();
    return (
        <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <h1 className={pageHeading}>Parks</h1>
                <CountryFilter country={country} />
            </div>
            {/* A new country starts again from its first page */}
            <ParkCards key={country ?? ''} country={country} firstPage={firstPage} />
        </>
    );
}

function CountryFilter({ country }: { country: string | undefined }) {
    const navigate = useNavigate({ from: '/parks/' });
    const hydrated = useHydrated();
    const id = useId();
    return (
        // Submitted only before hydration; after it, choosing a country is enough
        <form action="/parks" method="get" className="flex items-center gap-2 text-sm">
            <label htmlFor={id} className="text-muted-foreground">
                Country
            </label>
            <select
                id={id}
                name="country"
                value={country ?? ''}
                onChange={event => navigate({ search: { country: event.target.value || undefined } })}
                className={countrySelect}
            >
                <option value="" className={countryOption}>
                    <span aria-hidden="true">🌐</span> Every country
                </option>
                {countries.map(({ code, name }) => (
                    <option key={code} value={code} className={countryOption}>
                        <span aria-hidden="true">{flag(code)}</span> {name}
                    </option>
                ))}
            </select>
            {!hydrated && (
                <button type="submit" className={buttonClasses}>
                    Show
                </button>
            )}
        </form>
    );
}

function ParkCards({ country, firstPage }: { country: string | undefined; firstPage: Page<ParkCard> }) {
    const list = useRef<HTMLUListElement>(null);
    const hydrated = useHydrated();
    const { items, hasMore, loading, failed, announcement, load } = usePages({
        firstPage,
        fetchPage: after => getParks({ data: { after, country } }),
        list,
        announce: count => `${count} more ${count === 1 ? 'Park' : 'Parks'} loaded.`,
    });
    return (
        <>
            {items.length === 0 ? (
                <p className={quietNote}>
                    {country ? `No Parks in ${countryName({ country })} yet.` : 'No Parks yet.'}
                </p>
            ) : (
                <ul aria-label="Parks" ref={list} className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                    {items.map(park => (
                        <li key={park.id}>
                            <Link
                                to="/parks/$park"
                                params={{ park: parkParam(park) }}
                                className="flex h-full gap-3 rounded-md border p-2 hover:border-primary hover:bg-muted"
                            >
                                <Placeholder name={park.name} className="size-16 shrink-0 rounded" />
                                <span className="min-w-0 text-sm">
                                    <span className="block font-medium leading-snug break-words text-primary">
                                        {park.name}
                                    </span>
                                    <span className="block text-muted-foreground">{countryName(park)}</span>
                                    {park.status && (
                                        <span className="mt-0.5 block text-muted-foreground">
                                            <StatusName status={park.status} />
                                        </span>
                                    )}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            <div className="mt-6 flex items-center gap-3 text-sm">
                {/* Only once hydrated: pressed before then, it would do nothing */}
                {hydrated && hasMore && (
                    <button
                        type="button"
                        onClick={load}
                        // Not `disabled`, which would drop focus while the page loads
                        aria-disabled={loading}
                        className={cn(buttonClasses, 'aria-disabled:text-muted-foreground')}
                    >
                        {loading && <LoaderIcon aria-hidden="true" className="size-3.5 animate-spin" />}
                        {failed ? 'Try again' : 'Load more'}
                    </button>
                )}
                <p role="status" className={failed ? 'text-destructive' : 'sr-only'}>
                    {failed ? 'Parks could not be loaded.' : announcement}
                </p>
            </div>
        </>
    );
}
