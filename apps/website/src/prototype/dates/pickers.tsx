// PROTOTYPE (issue #41): ways to enter a Partial Date without typing it. A Partial Date is a year,
// a month or a day, never padded. See ADR 0010
import { Popover } from '@base-ui/react/popover';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, Undo2Icon } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { inputClasses } from '@/components/ui/field';
import { partialDateName } from '@/lib/partial-date';
import { cn } from '@/lib/utils';

export type Parts = { year?: number; month?: number; day?: number };

export const parse = (value: string | null): Parts => {
    if (!value) return {};
    const [year, month, day] = value.split('-').map(Number);
    return { year, month, day };
};

export const format = ({ year, month, day }: Parts): string | null => {
    if (!year) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    return [String(year), month && pad(month), month && day && pad(day)].filter(Boolean).join('-');
};

export const precisionOf = (value: string | null) =>
    value ? (['year', 'month', 'day'] as const)[value.split('-').length - 1] : null;

const THIS_YEAR = new Date().getFullYear();
const monthName = (month: number, width: 'short' | 'long' = 'long') =>
    new Intl.DateTimeFormat('en-GB', { month: width }).format(new Date(2000, month - 1, 1));
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const daysIn = (year: number, month: number) => new Date(year, month, 0).getDate();
/** Monday first, as in en-GB */
const firstWeekday = (year: number, month: number) => (new Date(year, month - 1, 1).getDay() + 6) % 7;
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const shown = (value: string | null) => (value ? partialDateName(value) : null);

const cell = (selected: boolean, current = false) =>
    cn(
        'h-full min-h-0 rounded-md text-sm tabular outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
        current && 'font-semibold text-primary',
        selected && 'bg-primary text-primary-foreground hover:bg-primary',
    );

function YearGrid({ selected, onPick }: { selected?: number; onPick: (year: number) => void }) {
    const [start, setStart] = useState(() => Math.floor((selected ?? THIS_YEAR) / 12) * 12);
    return (
        <div className="flex h-full flex-col">
            <div className="mb-1 flex items-center justify-between">
                <Button size="sm" variant="ghost" onClick={() => setStart(s => s - 12)} aria-label="Earlier years">
                    <ChevronLeftIcon className="size-4" />
                </Button>
                <span className="text-xs text-muted-foreground tabular">
                    {start} to {start + 11}
                </span>
                <Button size="sm" variant="ghost" onClick={() => setStart(s => s + 12)} aria-label="Later years">
                    <ChevronRightIcon className="size-4" />
                </Button>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-4 grid-rows-3 gap-1">
                {Array.from({ length: 12 }, (_, i) => start + i).map(year => (
                    <button
                        key={year}
                        type="button"
                        className={cell(year === selected, year === THIS_YEAR)}
                        aria-pressed={year === selected}
                        onClick={() => onPick(year)}
                    >
                        {year}
                    </button>
                ))}
            </div>
        </div>
    );
}

function MonthGrid({ selected, onPick }: { selected?: number; onPick: (month: number) => void }) {
    return (
        <div className="grid h-full grid-cols-3 grid-rows-4 gap-1">
            {MONTHS.map(month => (
                <button
                    key={month}
                    type="button"
                    className={cell(month === selected)}
                    aria-pressed={month === selected}
                    aria-label={monthName(month)}
                    onClick={() => onPick(month)}
                >
                    {monthName(month, 'short')}
                </button>
            ))}
        </div>
    );
}

function DayGrid({
    year,
    month,
    selected,
    onPick,
}: {
    year: number;
    month: number;
    selected?: number;
    onPick: (day: number) => void;
}) {
    return (
        // Always six weeks of rows, so every month is the same height
        <div className="grid h-full grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] gap-0.5">
            {WEEKDAYS.map(day => (
                <span key={day} className="grid h-7 place-items-center text-xs text-muted-foreground">
                    {day}
                </span>
            ))}
            <span
                style={{ gridColumn: `span ${firstWeekday(year, month)}` }}
                hidden={firstWeekday(year, month) === 0}
            />
            {Array.from({ length: daysIn(year, month) }, (_, i) => i + 1).map(day => (
                <button
                    key={day}
                    type="button"
                    className={cell(day === selected)}
                    aria-pressed={day === selected}
                    aria-label={`${day} ${monthName(month)} ${year}`}
                    onClick={() => onPick(day)}
                >
                    {day}
                </button>
            ))}
        </div>
    );
}

/** Looks like a field; shows the saved Partial Date. */
function Trigger({
    value,
    placeholder = 'Choose a date',
    ...props
}: Omit<React.ComponentProps<'button'>, 'value'> & { value: string | null; placeholder?: string }) {
    return (
        <button
            type="button"
            {...props}
            className={cn(inputClasses, 'flex items-center justify-between gap-2 text-left')}
        >
            {shown(value) ?? <span className="text-muted-foreground">{placeholder}</span>}
            <CalendarIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </button>
    );
}

const popup =
    'w-[19rem] origin-(--transform-origin) rounded-lg border bg-popover p-3 text-popover-foreground shadow-xl outline-none transition-[scale,opacity] duration-100 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0';

type PickerProps = { value: string | null; onChange: (value: string | null) => void; id?: string };

/** The draft lives in the popup until Save; closing without saving keeps the old value. */
function useDraft({ value, onChange }: PickerProps) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<Parts>(() => parse(value));
    return {
        open,
        draft,
        setDraft,
        view: (draft.month ? 'day' : draft.year ? 'month' : 'year') as 'year' | 'month' | 'day',
        onOpenChange: (next: boolean) => {
            if (next) setDraft(parse(value));
            setOpen(next);
        },
        save: () => {
            onChange(format(draft));
            setOpen(false);
        },
    };
}

/** One fixed height for years, months and days, so the popup never changes size. */
function Body({ draft, setDraft }: { draft: Parts; setDraft: (parts: Parts) => void }) {
    return (
        <div className="h-64">
            {draft.year ? (
                draft.month ? (
                    <DayGrid
                        year={draft.year}
                        month={draft.month}
                        selected={draft.day}
                        onPick={day => setDraft({ ...draft, day: day === draft.day ? undefined : day })}
                    />
                ) : (
                    <MonthGrid onPick={month => setDraft({ year: draft.year, month })} />
                )
            ) : (
                <YearGrid onPick={year => setDraft({ year })} />
            )}
        </div>
    );
}

/** Clear, Undo and Save. Save wakes up the moment the draft differs from what is saved. */
function Footer({ state, saved }: { state: ReturnType<typeof useDraft>; saved: string | null }) {
    const { draft, setDraft } = state;
    const undo = () => setDraft(draft.day ? { ...draft, day: undefined } : draft.month ? { year: draft.year } : {});
    return (
        <div className="mt-3 flex items-center gap-2 border-t pt-3">
            <Button variant="ghost" size="sm" onClick={() => setDraft({})} disabled={!draft.year}>
                Clear
            </Button>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={undo} disabled={!draft.year}>
                <Undo2Icon className="size-4" /> Undo
            </Button>
            <Button size="sm" onClick={state.save} disabled={format(draft) === saved}>
                Save
            </Button>
        </div>
    );
}

/** A: drill from years to months to days; the box at the top shows the date so far. */
export function DrillUndo(props: PickerProps) {
    const state = useDraft(props);
    const { draft, setDraft } = state;
    return (
        <Popover.Root open={state.open} onOpenChange={state.onOpenChange}>
            <Popover.Trigger render={<Trigger value={props.value} />} id={props.id} />
            <Popover.Portal>
                <Popover.Positioner sideOffset={6} align="start" className="z-50">
                    <Popover.Popup className={popup}>
                        <Popover.Title className="sr-only">Choose a date</Popover.Title>
                        <output className={cn(inputClasses, 'mb-3 flex items-center font-medium')} aria-live="polite">
                            {shown(format(draft)) ?? (
                                <span className="font-normal text-muted-foreground">No date yet</span>
                            )}
                        </output>
                        <Body draft={draft} setDraft={setDraft} />
                        <Footer state={state} saved={props.value} />
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}

/** B: the same drill, but the heading is the trail; click a part to choose it again. */
export function DrillTrail(props: PickerProps) {
    const state = useDraft(props);
    const { draft, setDraft } = state;
    const part = 'rounded px-1.5 py-0.5 hover:bg-muted hover:line-through';
    return (
        <Popover.Root open={state.open} onOpenChange={state.onOpenChange}>
            <Popover.Trigger render={<Trigger value={props.value} />} id={props.id} />
            <Popover.Portal>
                <Popover.Positioner sideOffset={6} align="start" className="z-50">
                    <Popover.Popup className={popup}>
                        <Popover.Title className="mb-1 text-xs text-muted-foreground">
                            {
                                {
                                    year: 'Choose a year',
                                    month: 'Choose a month, or save',
                                    day: 'Choose a day, or save',
                                }[state.view]
                            }
                        </Popover.Title>
                        <div className="mb-3 flex h-12 items-center gap-1 overflow-hidden border-b pb-2 text-lg font-semibold">
                            {!draft.year && <span className="px-1.5 font-normal text-muted-foreground">Any year</span>}
                            {draft.day && (
                                <button
                                    type="button"
                                    className={part}
                                    onClick={() => setDraft({ ...draft, day: undefined })}
                                    aria-label={`Remove day ${draft.day}`}
                                >
                                    {draft.day}
                                </button>
                            )}
                            {draft.month && (
                                <button
                                    type="button"
                                    className={part}
                                    onClick={() => setDraft({ year: draft.year })}
                                    aria-label={`Remove ${monthName(draft.month)}`}
                                >
                                    {monthName(draft.month)}
                                </button>
                            )}
                            {draft.year && (
                                <button
                                    type="button"
                                    className={part}
                                    onClick={() => setDraft({})}
                                    aria-label={`Remove ${draft.year}`}
                                >
                                    {draft.year}
                                </button>
                            )}
                        </div>
                        <Body draft={draft} setDraft={setDraft} />
                        <Footer state={state} saved={props.value} />
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}

const select = cn(inputClasses, 'w-auto appearance-auto pr-2');

/** C: say how precise first, then fill in that many parts. No popup; changes apply at once. */
export function PrecisionFirst({ value, onChange, id }: PickerProps) {
    const parts = parse(value);
    const [precision, setPrecision] = useState<'year' | 'month' | 'day'>(precisionOf(value) ?? 'year');
    const year = parts.year ?? THIS_YEAR;
    const set = (next: Parts, level = precision) =>
        onChange(
            format({
                year: next.year,
                month: level === 'year' ? undefined : (next.month ?? 1),
                day: level === 'day' ? Math.min(next.day ?? 1, daysIn(next.year ?? year, next.month ?? 1)) : undefined,
            }),
        );
    return (
        <div className="space-y-2">
            <fieldset className="inline-flex rounded-md bg-muted p-0.5 text-sm">
                <legend className="sr-only">How precise</legend>
                {(['year', 'month', 'day'] as const).map(level => (
                    <label
                        key={level}
                        className={cn(
                            'cursor-pointer rounded px-3 py-1 has-focus-visible:ring-2 has-focus-visible:ring-ring',
                            precision === level && 'bg-card font-medium shadow-sm',
                        )}
                    >
                        <input
                            type="radio"
                            className="sr-only"
                            checked={precision === level}
                            onChange={() => {
                                setPrecision(level);
                                if (value) set(parts, level);
                            }}
                        />
                        {level === 'day' ? 'Exact day' : `Just the ${level}`}
                    </label>
                ))}
            </fieldset>
            <div className="flex flex-wrap gap-2">
                {precision === 'day' && (
                    <select
                        aria-label="Day"
                        className={select}
                        value={parts.day ?? ''}
                        onChange={event => set({ ...parts, year, day: Number(event.target.value) })}
                    >
                        <option value="" disabled>
                            Day
                        </option>
                        {Array.from({ length: daysIn(year, parts.month ?? 1) }, (_, i) => i + 1).map(day => (
                            <option key={day} value={day}>
                                {day}
                            </option>
                        ))}
                    </select>
                )}
                {precision !== 'year' && (
                    <select
                        aria-label="Month"
                        className={select}
                        value={parts.month ?? ''}
                        onChange={event => set({ ...parts, year, month: Number(event.target.value) })}
                    >
                        <option value="" disabled>
                            Month
                        </option>
                        {MONTHS.map(month => (
                            <option key={month} value={month}>
                                {monthName(month)}
                            </option>
                        ))}
                    </select>
                )}
                <select
                    id={id}
                    aria-label="Year"
                    className={select}
                    value={parts.year ?? ''}
                    onChange={event => set({ ...parts, year: Number(event.target.value) })}
                >
                    <option value="" disabled>
                        Year
                    </option>
                    {Array.from({ length: THIS_YEAR + 10 - 1800 + 1 }, (_, i) => THIS_YEAR + 10 - i).map(y => (
                        <option key={y} value={y}>
                            {y}
                        </option>
                    ))}
                </select>
                {value && (
                    <Button variant="ghost" onClick={() => onChange(null)}>
                        Clear
                    </Button>
                )}
            </div>
        </div>
    );
}

/** D: a familiar calendar first; then choose how much of the picked day to keep. */
export function CalendarThenTrim(props: PickerProps) {
    const [open, setOpen] = useState(false);
    const initial = parse(props.value);
    const [view, setView] = useState({ year: initial.year ?? THIS_YEAR, month: initial.month ?? 1 });
    const [picked, setPicked] = useState<Parts>(initial);
    const step = (by: number) =>
        setView(v => {
            const m = v.month + by;
            return m < 1
                ? { year: v.year - 1, month: 12 }
                : m > 12
                  ? { year: v.year + 1, month: 1 }
                  : { ...v, month: m };
        });
    const save = (parts: Parts) => {
        props.onChange(format(parts));
        setOpen(false);
    };
    const options = picked.year
        ? [
              { label: 'Exact day', parts: picked.day ? picked : undefined },
              { label: 'Just the month', parts: { year: picked.year, month: picked.month } },
              { label: 'Just the year', parts: { year: picked.year } },
          ]
        : [
              { label: 'This month', parts: view },
              { label: 'This year', parts: { year: view.year } },
          ];
    return (
        <Popover.Root
            open={open}
            onOpenChange={next => {
                if (next) {
                    const parts = parse(props.value);
                    setPicked(parts);
                    setView({ year: parts.year ?? THIS_YEAR, month: parts.month ?? 1 });
                }
                setOpen(next);
            }}
        >
            <Popover.Trigger render={<Trigger value={props.value} />} id={props.id} />
            <Popover.Portal>
                <Popover.Positioner sideOffset={6} align="start" className="z-50">
                    <Popover.Popup className={popup}>
                        <Popover.Title className="sr-only">Choose a date</Popover.Title>
                        <div className="mb-2 flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => step(-1)} aria-label="Previous month">
                                <ChevronLeftIcon className="size-4" />
                            </Button>
                            <select
                                aria-label="Month"
                                className="h-8 flex-1 rounded-md bg-transparent text-sm font-medium hover:bg-muted"
                                value={view.month}
                                onChange={event => setView({ ...view, month: Number(event.target.value) })}
                            >
                                {MONTHS.map(m => (
                                    <option key={m} value={m}>
                                        {monthName(m)}
                                    </option>
                                ))}
                            </select>
                            <select
                                aria-label="Year"
                                className="h-8 rounded-md bg-transparent text-sm font-medium tabular hover:bg-muted"
                                value={view.year}
                                onChange={event => setView({ ...view, year: Number(event.target.value) })}
                            >
                                {Array.from({ length: THIS_YEAR + 10 - 1800 + 1 }, (_, i) => THIS_YEAR + 10 - i).map(
                                    y => (
                                        <option key={y} value={y}>
                                            {y}
                                        </option>
                                    ),
                                )}
                            </select>
                            <Button size="sm" variant="ghost" onClick={() => step(1)} aria-label="Next month">
                                <ChevronRightIcon className="size-4" />
                            </Button>
                        </div>
                        <DayGrid
                            year={view.year}
                            month={view.month}
                            selected={picked.year === view.year && picked.month === view.month ? picked.day : undefined}
                            onPick={day => setPicked({ ...view, day })}
                        />
                        <div className="mt-3 border-t pt-3">
                            <p className="mb-2 text-xs text-muted-foreground">
                                {picked.day ? 'Save as' : 'Not sure of the day? Save'}
                            </p>
                            <div className="grid gap-1">
                                {options.map(option =>
                                    option.parts ? (
                                        <Button
                                            key={option.label}
                                            variant="outline"
                                            size="sm"
                                            className="justify-between"
                                            onClick={() => save(option.parts as Parts)}
                                        >
                                            {option.label}
                                            <span className="font-normal text-muted-foreground">
                                                {shown(format(option.parts))}
                                            </span>
                                        </Button>
                                    ) : null,
                                )}
                            </div>
                        </div>
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}

export const PICKERS: Array<{
    key: string;
    name: string;
    idea: string;
    Picker: (props: PickerProps) => React.ReactNode;
}> = [
    {
        key: 'A',
        name: 'Drill with Undo',
        idea: 'Years, then months, then days, with the date so far in a box at the top.',
        Picker: DrillUndo,
    },
    {
        key: 'B',
        name: 'Drill with a trail',
        idea: 'The same drill. The heading is the date so far; click a part to remove it.',
        Picker: DrillTrail,
    },
    {
        key: 'C',
        name: 'Precision first',
        idea: 'Say how precise you are, then pick that many parts from lists. No popup.',
        Picker: PrecisionFirst,
    },
    {
        key: 'D',
        name: 'Calendar, then trim',
        idea: 'A normal calendar. Pick a day, then save it as the day, its month or its year.',
        Picker: CalendarThenTrim,
    },
];
