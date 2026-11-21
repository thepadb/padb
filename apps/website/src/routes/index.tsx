import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
    component: HomePage,
});

function HomePage() {
    return (
        <main>
            <h1>Parks & Attractions Database</h1>
            <p>An open, community-edited database of parks, rides and attractions. Coming soon.</p>
            <p>
                <Link to="/parks">Browse Parks</Link>
            </p>
        </main>
    );
}
