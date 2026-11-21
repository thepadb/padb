import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { api } from '../lib/api';
import { countryName, parkParam } from '../lib/park';

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
        <main>
            <h1>Parks</h1>
            {parks.length === 0 ? (
                <p>No Parks yet.</p>
            ) : (
                <ul>
                    {parks.map(park => (
                        <li key={park.id}>
                            <Link to="/parks/$park" params={{ park: parkParam(park) }}>
                                {park.name}
                            </Link>{' '}
                            ({countryName(park)})
                        </li>
                    ))}
                </ul>
            )}
            <nav aria-label="Pages">
                {!isFirstPage && <Link to="/parks">First page</Link>}{' '}
                {next && (
                    <Link to="/parks" search={{ after: next }}>
                        Next page
                    </Link>
                )}
            </nav>
        </main>
    );
}
