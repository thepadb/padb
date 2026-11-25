import { createFileRoute, Link } from '@tanstack/react-router';
import { pageHeading, textLink } from '@/components/text';

export const Route = createFileRoute('/')({
    component: HomePage,
});

function HomePage() {
    return (
        <>
            <h1 className={pageHeading}>Parks & Attractions Database</h1>
            <p className="mt-2 text-muted-foreground">
                An open, community-edited database of parks, rides and attractions. Coming soon.
            </p>
            <p className="mt-6">
                <Link to="/parks" className={textLink}>
                    Browse Parks
                </Link>
            </p>
        </>
    );
}
