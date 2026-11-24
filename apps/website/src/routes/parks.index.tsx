// PROTOTYPE (issue #41): fake data, no API.
import { createFileRoute } from '@tanstack/react-router';
import { useDesign } from '../prototype/design';
import { designs } from '../prototype/designs';

export const Route = createFileRoute('/parks/')({
    validateSearch: (search: Record<string, unknown>): { country?: string } =>
        typeof search.country === 'string' ? { country: search.country } : {},
    head: () => ({ meta: [{ title: 'Parks - Parks & Attractions Database' }] }),
    component: () => {
        const { ParksPage } = designs[useDesign().design];
        return <ParksPage />;
    },
});
