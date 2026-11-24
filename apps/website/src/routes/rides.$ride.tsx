// PROTOTYPE (issue #41): fake data, no API.
import { createFileRoute, notFound } from '@tanstack/react-router';
import { findRide } from '../prototype/data';
import { useDesign } from '../prototype/design';
import { designs } from '../prototype/designs';

export const Route = createFileRoute('/rides/$ride')({
    loader: ({ params }) =>
        findRide(params.ride)
        ?? (() => {
            throw notFound();
        })(),
    head: ({ loaderData }) => ({
        meta: loaderData ? [{ title: `${loaderData.name} - Parks & Attractions Database` }] : [],
    }),
    component: () => {
        const { RidePage } = designs[useDesign().design];
        return <RidePage ride={Route.useLoaderData()} />;
    },
});
