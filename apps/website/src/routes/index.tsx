// PROTOTYPE (issue #41): a hub linking every page and awkward case.
import { createFileRoute, Link } from '@tanstack/react-router';
import { parks, resorts, rides } from '../prototype/data';
import { statusLine } from '../prototype/status-line';

export const Route = createFileRoute('/')({
    component: HomePage,
});

function HomePage() {
    const link = 'text-primary underline underline-offset-2';
    return (
        <main className="mx-auto max-w-3xl px-6 py-12">
            <h1 className="font-display text-4xl font-bold">Design prototype (#41)</h1>
            <p className="mt-2 text-muted-foreground">
                ← / → change design, d toggles dark mode. Hover Park links for Preview Cards.
            </p>
            <h2 className="mt-8 font-display text-xl font-semibold">Pages</h2>
            <ul className="mt-2 list-disc pl-5">
                <li>
                    <Link className={link} to="/parks">
                        Parks list
                    </Link>
                </li>
                <li>
                    <Link className={link} to="/parks/new">
                        Sample form
                    </Link>
                </li>
                <li>
                    Resorts:{' '}
                    {resorts.map(r => (
                        <Link key={r.id} className={`${link} mr-3`} to="/resorts/$resort" params={{ resort: r.id }}>
                            {r.name}
                        </Link>
                    ))}
                </li>
                <li>
                    Rides:{' '}
                    {rides
                        .filter(r => ['nachtfalke', 'the-abyss', 'helter-skelter'].includes(r.id))
                        .map(r => (
                            <Link key={r.id} className={`${link} mr-3`} to="/rides/$ride" params={{ ride: r.id }}>
                                {r.name}
                            </Link>
                        ))}
                </li>
            </ul>
            <h2 className="mt-8 font-display text-xl font-semibold">Parks and their status lines</h2>
            <ul className="mt-2 grid gap-1 text-sm">
                {parks.map(p => (
                    <li key={p.id}>
                        <Link className={link} to="/parks/$park" params={{ park: p.id }}>
                            {p.name}
                        </Link>
                        {' - '}
                        <span className="text-muted-foreground">
                            {statusLine(p.statusHistory) ?? '(no Status History: no line)'}
                        </span>
                    </li>
                ))}
            </ul>
        </main>
    );
}
