// PROTOTYPE (issue #41): fake data, no API.
import { createFileRoute, notFound } from '@tanstack/react-router';
import { findPark } from '../prototype/data';
import { useDesign } from '../prototype/design';
import { designs } from '../prototype/designs';

export const Route = createFileRoute('/parks/$park')({
    loader: ({ params }) =>
        findPark(params.park)
        ?? (() => {
            throw notFound();
        })(),
    head: ({ loaderData }) => ({
        meta: loaderData ? [{ title: `${loaderData.name} - Parks & Attractions Database` }] : [],
    }),
    component: () => {
        const { ParkPage } = designs[useDesign().design];
        return <ParkPage park={Route.useLoaderData()} />;
    },
});
