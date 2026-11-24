// PROTOTYPE (issue #41): fake data, no API.
import { createFileRoute, notFound } from '@tanstack/react-router';
import { findResort } from '../prototype/data';
import { useDesign } from '../prototype/design';
import { designs } from '../prototype/designs';

export const Route = createFileRoute('/resorts/$resort')({
    loader: ({ params }) =>
        findResort(params.resort)
        ?? (() => {
            throw notFound();
        })(),
    head: ({ loaderData }) => ({
        meta: loaderData ? [{ title: `${loaderData.name} - Parks & Attractions Database` }] : [],
    }),
    component: () => {
        const { ResortPage } = designs[useDesign().design];
        return <ResortPage resort={Route.useLoaderData()} />;
    },
});
