// PROTOTYPE (issue #41): design F's facts, edited where they sit. Name and Status are history, so
// editing them asks whether it changed or was wrong, and shows what that does to the history first.
import type { Status } from '@padb/api-client';
import { PencilIcon } from 'lucide-react';
import type * as React from 'react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { inputClasses } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { partialDateName } from '@/lib/partial-date';
import { statusName } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { NameEntry, StatusEntry } from '../data';
import { DrillTrail } from '../dates/pickers';
import { PARTIAL_DATE, statusItems } from '../sample-form';
import { PartialDate, StatusDot } from '../shared';

/** What the user has suggested on this page. Nothing is saved: suggestions go to a Moderator. */
export type Pending = {
    name?: { kind: 'renamed'; to: string; from: string } | { kind: 'fixed'; to: string };
    status?: { kind: 'changed' | 'fixed'; entry: StatusEntry };
};

export function usePending() {
    const [pending, setPending] = useState<Pending>({});
    return { pending, suggest: (next: Partial<Pending>) => setPending(prev => ({ ...prev, ...next })) };
}

const rowGrid =
    'group grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-start gap-x-3 border-b py-2 last:border-0 sm:grid-cols-[10rem_minmax(0,1fr)_auto]';
const mark = 'rounded-sm bg-accent px-1 text-accent-foreground';
const note = 'block text-xs text-muted-foreground';
const label = 'mb-1 block text-xs font-medium text-muted-foreground';

function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`Edit ${label}`}
            className="grid size-6 place-items-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring max-lg:opacity-100"
        >
            <PencilIcon className="size-3.5" />
        </button>
    );
}

function Actions({ onCancel, submit = 'Suggest edit' }: { onCancel: () => void; submit?: string }) {
    return (
        <div className="flex gap-2">
            <Button type="submit" size="sm">
                {submit}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
                Cancel
            </Button>
        </div>
    );
}

/** Two ways to edit a history-backed fact. */
function Choice<T extends string>({
    name,
    value,
    onChange,
    options,
}: {
    name: string;
    value: T;
    onChange: (value: T) => void;
    options: Array<{ value: T; label: string }>;
}) {
    return (
        <fieldset className="flex flex-wrap gap-1 rounded-md bg-muted p-0.5 text-sm">
            <legend className="sr-only">What happened?</legend>
            {options.map(option => (
                <label
                    key={option.value}
                    className={cn(
                        'cursor-pointer rounded px-2.5 py-1 has-focus-visible:ring-2 has-focus-visible:ring-ring',
                        value === option.value && 'bg-card font-medium shadow-sm',
                    )}
                >
                    <input
                        type="radio"
                        name={name}
                        value={option.value}
                        checked={value === option.value}
                        onChange={() => onChange(option.value)}
                        className="sr-only"
                    />
                    {option.label}
                </label>
            ))}
        </fieldset>
    );
}

/** A Partial Date field using picker B; it posts its value as `name`. */
function DateInput({
    name,
    labelText,
    required,
    defaultValue,
    error,
}: {
    name: string;
    labelText: string;
    required?: boolean;
    defaultValue?: string | null;
    error?: string;
}) {
    const [value, setValue] = useState(defaultValue ?? null);
    const id = useId();
    return (
        <div className="w-56">
            <label htmlFor={id} className={label}>
                {labelText}
                {!required && ' (optional)'}
            </label>
            <DrillTrail id={id} name={name} value={value} onChange={setValue} invalid={Boolean(error)} />
            {error && <span className="mt-1 block text-xs font-medium text-destructive">{error}</span>}
        </div>
    );
}

/** Reads a Partial Date field; `undefined` means it is invalid. */
function readDate(form: FormData, name: string, required: boolean): string | null | undefined {
    const value = String(form.get(name) ?? '').trim();
    if (!value) return required ? undefined : null;
    return PARTIAL_DATE.test(value) ? value : undefined;
}

const DATE_ERROR = 'Choose a date.';

export type Fact = { label: string; value: React.ReactNode; raw?: string };

/** A plain fact: no history, so an edit just replaces it. */
export function FactRow({ fact }: { fact: Fact }) {
    const [editing, setEditing] = useState(false);
    const [suggested, setSuggested] = useState<string | null>(null);
    return (
        <div className={rowGrid}>
            <dt className="pt-px text-sm text-muted-foreground">{fact.label}</dt>
            {editing ? (
                <dd className="col-span-2">
                    <form
                        className="flex flex-wrap gap-2"
                        onSubmit={event => {
                            event.preventDefault();
                            setSuggested(String(new FormData(event.currentTarget).get('value')));
                            setEditing(false);
                        }}
                        onKeyDown={event => event.key === 'Escape' && setEditing(false)}
                    >
                        <input
                            name="value"
                            defaultValue={suggested ?? fact.raw}
                            aria-label={fact.label}
                            // biome-ignore lint/a11y/noAutofocus: the user just asked to edit this field
                            autoFocus
                            className={cn(inputClasses, 'min-w-0 flex-1 basis-48')}
                        />
                        <Actions onCancel={() => setEditing(false)} />
                    </form>
                </dd>
            ) : (
                <>
                    <dd className="min-w-0 text-sm break-words">
                        {suggested === null ? (
                            fact.value
                        ) : (
                            <>
                                <span className="text-muted-foreground line-through">{fact.raw}</span>{' '}
                                <mark className={mark}>{suggested}</mark>
                                <span className={note}>Suggested. A Moderator will review it.</span>
                            </>
                        )}
                    </dd>
                    {fact.raw !== undefined && <EditButton label={fact.label} onClick={() => setEditing(true)} />}
                </>
            )}
        </div>
    );
}

/** The name is the last entry in Name History: a rename adds an entry, a fix corrects the last one. */
export function NameRow({
    name,
    pending,
    suggest,
}: {
    name: string;
    pending: Pending;
    suggest: (next: Partial<Pending>) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [kind, setKind] = useState<'renamed' | 'fixed'>('renamed');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const current = pending.name?.to ?? name;
    return (
        <div className={rowGrid}>
            <dt className="pt-px text-sm text-muted-foreground">Name</dt>
            {editing ? (
                <dd className="col-span-2">
                    <form
                        className="grid gap-3"
                        noValidate
                        onKeyDown={event => event.key === 'Escape' && setEditing(false)}
                        onSubmit={event => {
                            event.preventDefault();
                            const form = new FormData(event.currentTarget);
                            const to = String(form.get('value') ?? '').trim();
                            const found: Record<string, string> = {};
                            if (!to) found.value = 'Enter a name.';
                            else if (to === name) found.value = 'That is already the name.';
                            if (kind === 'renamed') {
                                const from = readDate(form, 'from', true);
                                if (from === undefined) found.from = DATE_ERROR;
                                setErrors(found);
                                if (Object.keys(found).length) return;
                                suggest({ name: { kind, to, from: from as string } });
                            } else {
                                setErrors(found);
                                if (Object.keys(found).length) return;
                                suggest({ name: { kind, to } });
                            }
                            setEditing(false);
                        }}
                    >
                        <Choice
                            name="name-kind"
                            value={kind}
                            onChange={setKind}
                            options={[
                                { value: 'renamed', label: 'It was renamed' },
                                { value: 'fixed', label: 'Fix a mistake' },
                            ]}
                        />
                        <label className="block">
                            <span className={label}>{kind === 'renamed' ? 'New name' : 'Correct name'}</span>
                            <input
                                name="value"
                                // Start from the current name: a new name is often a small change to it
                                defaultValue={name}
                                key={kind}
                                aria-invalid={Boolean(errors.value)}
                                // biome-ignore lint/a11y/noAutofocus: the user just asked to edit this field
                                autoFocus
                                className={cn(inputClasses, 'aria-invalid:border-destructive')}
                            />
                            {errors.value && (
                                <span className="mt-1 block text-xs font-medium text-destructive">{errors.value}</span>
                            )}
                        </label>
                        {kind === 'renamed' && (
                            <DateInput name="from" labelText="New name first used" required error={errors.from} />
                        )}
                        <p className="text-xs text-muted-foreground">
                            {kind === 'renamed'
                                ? 'Adds the new name to the end of Name History. Earlier names stay.'
                                : 'Corrects the last entry in Name History. Use this for spelling and typos only.'}
                        </p>
                        <Actions onCancel={() => setEditing(false)} />
                    </form>
                </dd>
            ) : (
                <>
                    <dd className="min-w-0 text-sm break-words">
                        {pending.name ? (
                            <>
                                <span className="text-muted-foreground line-through">{name}</span>{' '}
                                <mark className={mark}>{current}</mark>
                                <span className={note}>
                                    {pending.name.kind === 'renamed'
                                        ? `Suggested rename from ${partialDateName(pending.name.from)}. A Moderator will review it.`
                                        : 'Suggested correction. A Moderator will review it.'}
                                </span>
                            </>
                        ) : (
                            name
                        )}
                    </dd>
                    <EditButton
                        label="Name"
                        onClick={() => {
                            setKind('renamed');
                            setErrors({});
                            setEditing(true);
                        }}
                    />
                </>
            )}
        </div>
    );
}

/** The current Status is the last in Status History, so editing it adds an entry or fixes the last one. */
export function StatusRow({
    history,
    pending,
    suggest,
}: {
    history: Array<StatusEntry>;
    pending: Pending;
    suggest: (next: Partial<Pending>) => void;
}) {
    const last = history.at(-1);
    const [editing, setEditing] = useState(false);
    const [kind, setKind] = useState<'changed' | 'fixed'>('changed');
    const [error, setError] = useState<string | undefined>();
    const shown = pending.status?.entry ?? last;
    return (
        <div className={rowGrid}>
            <dt className="pt-px text-sm text-muted-foreground">Status</dt>
            {editing ? (
                <dd className="col-span-2">
                    <form
                        className="grid gap-3"
                        noValidate
                        onKeyDown={event => event.key === 'Escape' && setEditing(false)}
                        onSubmit={event => {
                            event.preventDefault();
                            const form = new FormData(event.currentTarget);
                            const began = readDate(form, 'began', kind === 'changed');
                            if (began === undefined) return setError(DATE_ERROR);
                            const status = String(form.get('status')) as Status;
                            suggest({ status: { kind, entry: { status, began } } });
                            setError(undefined);
                            setEditing(false);
                        }}
                    >
                        {last && (
                            <Choice
                                name="status-kind"
                                value={kind}
                                onChange={setKind}
                                options={[
                                    { value: 'changed', label: 'The Status changed' },
                                    { value: 'fixed', label: 'Fix the current one' },
                                ]}
                            />
                        )}
                        <div key={kind} className="flex flex-wrap items-start gap-4">
                            <div className="w-56">
                                <span className={label}>{kind === 'changed' ? 'New Status' : 'Status'}</span>
                                <Select
                                    items={statusItems}
                                    name="status"
                                    placeholder="Choose a Status"
                                    defaultValue={kind === 'fixed' ? last?.status : null}
                                />
                            </div>
                            <DateInput
                                name="began"
                                labelText="From"
                                required={kind === 'changed'}
                                defaultValue={kind === 'fixed' ? last?.began : null}
                                error={error}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {kind === 'changed'
                                ? 'Adds a new entry to the end of Status History. Earlier entries stay.'
                                : 'Replaces the last entry in Status History. Use this when it was recorded wrongly.'}
                        </p>
                        <Actions onCancel={() => setEditing(false)} />
                    </form>
                </dd>
            ) : (
                <>
                    <dd className="min-w-0 text-sm">
                        {shown ? (
                            <span className={cn('inline-flex flex-wrap items-center gap-x-2', pending.status && mark)}>
                                <StatusDot status={shown.status} className="size-2" />
                                {statusName(shown.status)}
                                {shown.began && (
                                    <span className="text-muted-foreground">
                                        since <PartialDate value={shown.began} />
                                    </span>
                                )}
                            </span>
                        ) : (
                            <span className="text-muted-foreground">Not recorded</span>
                        )}
                        {pending.status && (
                            <span className={note}>
                                {pending.status.kind === 'changed' ? 'Suggested new Status' : 'Suggested correction'}. A
                                Moderator will review it.
                            </span>
                        )}
                    </dd>
                    <EditButton label="Status" onClick={() => setEditing(true)} />
                </>
            )}
        </div>
    );
}

const table =
    'w-full text-[13px] tabular [&_td]:border-t [&_td]:py-1 [&_td]:pr-4 [&_th]:pb-1.5 [&_th]:pr-4 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground';
const empty = (text: string) => <p className="text-sm text-muted-foreground">{text}</p>;

/** Status History with any suggestion shown in place. In the order saved. See ADR 0010 */
export function StatusHistoryTable({ rows, pending }: { rows: Array<StatusEntry>; pending: Pending }) {
    const change = pending.status;
    const shown = rows.map((entry, i) => ({ entry, state: 'kept' as 'kept' | 'replaced' | 'new', i }));
    if (change?.kind === 'fixed' && shown.length) shown[shown.length - 1].state = 'replaced';
    if (change) shown.push({ entry: change.entry, state: 'new', i: rows.length });
    if (shown.length === 0) return empty('No Status History yet.');
    return (
        <table className={table}>
            <thead>
                <tr>
                    <th>Status</th>
                    <th>From</th>
                </tr>
            </thead>
            <tbody>
                {shown.map(({ entry, state, i }) => (
                    <tr key={i} className={cn(state === 'replaced' && 'text-muted-foreground line-through')}>
                        <td>
                            <span className={cn('inline-flex items-center gap-2', state === 'new' && mark)}>
                                <StatusDot status={entry.status} className="size-2" />
                                {statusName(entry.status)}
                            </span>
                        </td>
                        <td>
                            <PartialDate value={entry.began} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/** Name History, ending with the current name, with any suggestion shown in place. */
export function NameHistoryTable({ rows, pending }: { rows: Array<NameEntry>; pending: Pending }) {
    const change = pending.name;
    const shown = rows.map((entry, i) => ({ entry, state: 'kept' as 'kept' | 'replaced' | 'new', i }));
    if (change?.kind === 'fixed' && shown.length) {
        shown[shown.length - 1].state = 'replaced';
        shown.push({
            entry: { name: change.to, first_used: rows.at(-1)?.first_used ?? null },
            state: 'new',
            i: rows.length,
        });
    }
    if (change?.kind === 'renamed') {
        shown.push({ entry: { name: change.to, first_used: change.from }, state: 'new', i: rows.length });
    }
    if (shown.length === 0) return empty('No Name History yet.');
    return (
        <table className={table}>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>First used</th>
                </tr>
            </thead>
            <tbody>
                {shown.map(({ entry, state, i }) => (
                    <tr key={i} className={cn(state === 'replaced' && 'text-muted-foreground line-through')}>
                        <td>{state === 'new' ? <mark className={mark}>{entry.name}</mark> : entry.name}</td>
                        <td>
                            <PartialDate value={entry.first_used} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
