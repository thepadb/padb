// PROTOTYPE (issue #41): a sample form; nothing is saved.
import { createFileRoute } from '@tanstack/react-router';
import { useDesign } from '../prototype/design';
import { designs } from '../prototype/designs';

export const Route = createFileRoute('/parks/new')({
    head: () => ({ meta: [{ title: 'Suggest a Park - Parks & Attractions Database' }] }),
    component: () => {
        const { FormPage } = designs[useDesign().design];
        return <FormPage />;
    },
});
