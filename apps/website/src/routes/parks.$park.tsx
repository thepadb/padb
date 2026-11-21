import { createFileRoute, notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { api } from '../lib/api';
import { countryName, parkId } from '../lib/park';

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
                <dd>{countryName(park)}</dd>
            </dl>
        </main>
    );
}
