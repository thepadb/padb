import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { api } from '../lib/api';
import { countryName, parkParam } from '../lib/park';
import { pageHeading, quietNote, textLink } from '@/components/text';
import { cn } from 'cn';

type Search = { after?: string };

const getParks = createServerFn({ method: 'GET' })
    .validator((after: string | undefined) => after)
    .handler(async ({ data: after }) => {
        const { data, response } = await api.GET('/v1/parks', { params: { query: { after } } });
        // A cursor the API cannot read, e.g. an edited URL
        if (response.status === 400) {
            return null;
        }
        if (!data) {
            throw new Error(`The API answered ${response.status} for the Parks list`);
        }
        return data;
    });

export const Route = createFileRoute('/parks/')({
    validateSearch: (search: Record<string, unknown>): Search =>
        typeof search.after === 'string' ? { after: search.after } : {},
    loaderDeps: ({ search }) => ({ after: search.after }),
    loader: async ({ deps }) => {
        const page = await getParks({ data: deps.after });
        if (!page) {
            throw notFound();
        }
        return { ...page, isFirstPage: deps.after === undefined };
    },
    head: () => ({ meta: [{ title: 'Parks - Parks & Attractions Database' }] }),
    component: ParksPage,
});

function ParksPage() {
    const { parks, next, isFirstPage } = Route.useLoaderData();
    return (
        <>
            <h1 className={pageHeading}>Parks</h1>
            {parks.length === 0 ? (
                <p className={cn(quietNote, 'mt-4')}>No Parks yet.</p>
            ) : (
                <ul className="mt-4 space-y-1">
                    {parks.map(park => (
                        <li key={park.id}>
                            <Link to="/parks/$park" params={{ park: parkParam(park) }} className={textLink}>
                                {park.name}
                            </Link>{' '}
                            ({countryName(park)})
                        </li>
                    ))}
                </ul>
            )}
            <nav aria-label="Pages" className="mt-6 flex gap-4">
                {!isFirstPage && (
                    <Link to="/parks" className={textLink}>
                        First page
                    </Link>
                )}
                {next && (
                    <Link to="/parks" search={{ after: next }} className={textLink}>
                        Next page
                    </Link>
                )}
            </nav>
        </>
    );
}
