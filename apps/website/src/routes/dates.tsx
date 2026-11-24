// PROTOTYPE (issue #41): ways to enter a Partial Date, each lettered, side by side. Nothing is saved.
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { PICKERS, precisionOf } from '../prototype/dates/pickers';

export const Route = createFileRoute('/dates')({
    head: () => ({ meta: [{ title: 'Partial Date pickers - Parks & Attractions Database' }] }),
    component: DatesPage,
});

function Field({
    label,
    initial,
    Picker,
    id,
}: {
    label: string;
    initial: string | null;
    Picker: (typeof PICKERS)[number]['Picker'];
    id: string;
}) {
    const [value, setValue] = useState(initial);
    return (
        <div>
            <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted-foreground">
                {label}
            </label>
            <Picker id={id} value={value} onChange={setValue} />
            {/* The state, so each change can be checked */}
            <p className="mt-1.5 text-xs text-muted-foreground tabular">
                {value ? `Stored as ${value}, ${precisionOf(value)} precision` : 'Stored as null (unknown)'}
            </p>
        </div>
    );
}

function DatesPage() {
    return (
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
            <h1 className="text-2xl font-semibold">Partial Date pickers</h1>
            <p className="mt-1 max-w-[65ch] text-muted-foreground">
                A Partial Date is a year, a month or a day, never padded. Each letter is a different way to enter one.
                Try the empty field and the filled one.
            </p>
            <ol className="mt-8 grid gap-4 md:grid-cols-2">
                {PICKERS.map(({ key, name, idea, Picker }) => (
                    <li key={key} className="rounded-lg border bg-card p-5">
                        <h2 className="flex items-baseline gap-3">
                            <span className="grid size-7 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                                {key}
                            </span>
                            <span className="font-semibold">{name}</span>
                        </h2>
                        <p className="mt-1 mb-4 text-sm text-muted-foreground">{idea}</p>
                        <div className="grid gap-4">
                            <Field label="Opened" initial={null} Picker={Picker} id={`${key}-opened`} />
                            <Field label="Closed" initial="1999-10" Picker={Picker} id={`${key}-closed`} />
                        </div>
                    </li>
                ))}
            </ol>
        </main>
    );
}
