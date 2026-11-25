import { createFileRoute, notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { api } from '../lib/api';
import { partialDateName } from '../lib/partial-date';
import { countryName, parkId } from '../lib/park';
import { statusName } from '../lib/status';
import { pageHeading, quietNote, sectionHeading } from '@/components/text';

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
        <>
            <h1 className={pageHeading}>{park.name}</h1>
            <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Country</dt>
                <dd>{countryName(park)}</dd>
            </dl>
            <h2 className={sectionHeading}>Areas</h2>
            {park.areas.length === 0 ? (
                <p className={quietNote}>No Areas yet.</p>
            ) : (
                <ul className="space-y-1 text-sm">
                    {park.areas.map(area => (
                        <li key={area.id}>{area.name}</li>
                    ))}
                </ul>
            )}
            <h2 className={sectionHeading}>Status History</h2>
            {park.status_history.length === 0 ? (
                <p className={quietNote}>No Status History yet.</p>
            ) : (
                // In the order saved, not sorted by date. See ADR 0010
                <ol className="space-y-1 text-sm">
                    {park.status_history.map((entry, position) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: entries have no IDs and a Status can recur
                        <li key={position}>
                            {statusName(entry.status)}
                            {entry.began ? (
                                <>
                                    {' from '}
                                    <time dateTime={entry.began}>{partialDateName(entry.began)}</time>
                                </>
                            ) : (
                                ', date unknown'
                            )}
                        </li>
                    ))}
                </ol>
            )}
            <h2 className={sectionHeading}>Name History</h2>
            {park.name_history.length === 0 ? (
                <p className={quietNote}>No Name History yet.</p>
            ) : (
                // In the order saved, not sorted by date. See ADR 0010
                <ol className="space-y-1 text-sm">
                    {park.name_history.map((entry, position) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: entries have no IDs and a name can recur
                        <li key={position}>
                            {entry.name}
                            {entry.first_used ? (
                                <>
                                    {', first used '}
                                    <time dateTime={entry.first_used}>{partialDateName(entry.first_used)}</time>
                                </>
                            ) : (
                                ', date unknown'
                            )}
                        </li>
                    ))}
                </ol>
            )}
        </>
    );
}
