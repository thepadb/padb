import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { api } from '@/lib/api';
import { countryName, parkId } from '@/lib/park';
import { Breadcrumbs, EmptyNote, Facts, HistoryTable, Placeholder, Section, StatusName } from '@/components/sheet';
import { compactText, pageHeading, textLink } from '@/components/text';
import { cn } from 'cn';

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

// Every block but the placeholder sits in the first column; from xl the placeholder moves beside them.
const firstColumn = 'xl:col-start-1';

function ParkPage() {
    const park = Route.useLoaderData();
    return (
        <div className="grid xl:grid-cols-[minmax(0,1fr)_15rem] xl:gap-x-10">
            <Breadcrumbs className={firstColumn}>
                {[
                    <Link key="parks" to="/parks" className={textLink}>
                        Parks
                    </Link>,
                    park.name,
                ]}
            </Breadcrumbs>
            <Placeholder
                name={park.name}
                className="mt-4 aspect-[3/1] w-full rounded-md xl:col-start-2 xl:row-span-5 xl:row-start-1 xl:mt-0 xl:aspect-square"
            />
            <h1 className={cn(pageHeading, firstColumn, 'mt-4 mb-8 text-balance break-words')}>{park.name}</h1>
            <Section title="Details" className={firstColumn}>
                {/* Coordinates join Country once Parks have them (#34) */}
                <Facts facts={[{ label: 'Country', value: countryName(park) }]} />
            </Section>
            <Section title="Areas" count={park.areas.length} className={firstColumn}>
                {park.areas.length === 0 ? (
                    <EmptyNote>No Areas yet.</EmptyNote>
                ) : (
                    <ul className="flex flex-wrap gap-1.5">
                        {park.areas.map(area => (
                            <li key={area.id} className={cn(compactText, 'rounded-md border bg-muted px-2 py-0.5')}>
                                {area.name}
                            </li>
                        ))}
                    </ul>
                )}
            </Section>
            <div className={cn(firstColumn, 'grid gap-x-8 md:grid-cols-2')}>
                <Section title="Status History" count={park.status_history.length}>
                    <HistoryTable
                        headings={['Status', 'From']}
                        rows={park.status_history.map(entry => [
                            <StatusName key="status" status={entry.status} />,
                            entry.began,
                        ])}
                        empty="No Status History yet."
                    />
                </Section>
                <Section title="Name History" count={park.name_history.length}>
                    <HistoryTable
                        headings={['Name', 'First used']}
                        rows={park.name_history.map(entry => [entry.name, entry.first_used])}
                        empty="No Name History yet."
                    />
                </Section>
            </div>
        </div>
    );
}
