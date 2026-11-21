import { createFileRoute, notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { api } from '../lib/api';

const PARK_PARAM = /^([0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:-|$)/i;

/** The Park ID at the start of `<id>-<slug>`; the slug is cosmetic and ignored. See ADR 0008 */
function parkId(param: string): string | undefined {
    return PARK_PARAM.exec(param)?.[1];
}

const getPark = createServerFn({ method: 'GET' })
    .validator((id: string) => id)
    .handler(async ({ data: id }) => {
        const { data, response } = await api.GET('/v1/parks/{id}', { params: { path: { id } } });
        if (response.status === 404) {
            return null;
        }
        if (!data) {
            throw new Error(`The API answered ${response.status} for Park ${id}`);
        }
        return data;
    });

const countryNames = new Intl.DisplayNames(['en-GB'], { type: 'region' });

export const Route = createFileRoute('/parks/$park')({
    loader: async ({ params }) => {
        const id = parkId(params.park);
        const park = id ? await getPark({ data: id }) : null;
        if (!park) {
            throw notFound();
        }
        return park;
    },
    head: ({ loaderData }) => ({
        meta: loaderData ? [{ title: `${loaderData.name} - Parks & Attractions Database` }] : [],
    }),
    component: ParkPage,
});

function ParkPage() {
    const park = Route.useLoaderData();
    return (
        <main>
            <h1>{park.name}</h1>
            <dl>
                <dt>Country</dt>
                <dd>{countryNames.of(park.country) ?? park.country}</dd>
            </dl>
        </main>
    );
}
