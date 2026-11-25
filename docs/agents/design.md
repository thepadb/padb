# Design guide

How the website looks and how to build pages in that look. Follow it for any UI work. The look is design F, "Workbench" (#43): a tool for people who browse and edit. Grey panes, white sheets of detail, teal links, highlighter yellow for the selection. ADR 0019 records the stack.

## Stack

* Tailwind CSS v4 for all styling; no other CSS but `src/styles.css`.
* Components follow shadcn/ui on Base UI: copied into `src/components/ui` and owned by us, then fitted to the tokens below. Add one with `pnpm dlx shadcn@latest add <name>` from `apps/website`; `components.json` picks Base UI.
* `cn()` from the `cn` package (shadcn's own) joins class names, later Tailwind classes winning.
* Icons from `lucide-react`, with `aria-hidden="true"` unless the icon is the only label.
* IBM Plex Sans (variable), self-hosted through Fontsource, is the only font. Never load fonts from a third party.

## Tokens

All colours, the font and radii are defined once in `apps/website/src/styles.css`: CSS custom properties on `:root` for light, overridden under `prefers-color-scheme: dark`, and exposed to Tailwind in `@theme inline`.

**No raw colours in components.** Never write a hex, `rgb()`, or a Tailwind palette colour (`bg-white`, `text-gray-500`, `text-red-600`). Use the token names, which switch with the theme:

| Token | Use for |
| --- | --- |
| `background` / `foreground` | Grey panes behind sheets; body text |
| `card` | Sheets, the header and footer, popovers |
| `primary` / `primary-foreground` | Links (teal), primary buttons, focus rings |
| `secondary` / `secondary-foreground` | Active nav items, quiet tinted fills |
| `muted` / `muted-foreground` | Hover fills; secondary text, notes, labels |
| `accent` / `accent-foreground` | Highlighter yellow: the current selection only |
| `destructive` | Errors |
| `border`, `input`, `ring` | Dividers, field borders, focus |
| `status-operating`, `status-paused`, `status-stopped`, `status-none` | A Status's dot or mark: green, amber, red, grey; `statusTone` picks one |
| `placeholder` / `placeholder-foreground` | A photo placeholder's tint and initials; the hue comes from the record's name |

A new colour is a new token, light and dark, added to `styles.css`, never a one-off. Dark follows the operating system; there is no manual switch.

## The shell

Every page renders inside `Shell` (`src/components/shell.tsx`), applied once in `__root.tsx`:

* **Header**: the PADB wordmark (links home) and the top nav (`nav` labelled "Main"). The active item uses `secondary`.
* **Sheet**: the `main` landmark, a white card on the grey pane. A page renders its content straight into it and never adds its own `main`. Its `h1` is the page's name.
* **Footer**: licences and the link to the running commit (ADR 0011).
* A "Skip to content" link, the first thing focused, moves focus to the sheet.

The not found page renders inside the shell with a link home, so a bad link never strands anyone.

## Page conventions

Shared text styles live in `src/components/text.ts`; use them rather than copying their classes.

* Headings: `pageHeading` for the `h1`, `sectionHeading` for a section's `h2`.
* Links in text: `textLink`, teal and underlined, so they don't rely on colour alone.
* Quiet notes for empty data (`No Areas yet.`): `quietNote`, or `EmptyNote` on a sheet.
* Partial Dates are shown at their own precision, never padded (ADR 0010); use `PartialDate`, or `partialDateName` for plain text.

## A record's sheet

A record's page (the Park page first; Rides and Resorts later) fills the sheet in this order, built from `src/components/sheet.tsx`:

1. **Breadcrumbs** (`Breadcrumbs`): the trail from the top-level list, e.g. Parks → the Park, the last item the page itself.
2. **Placeholder** (`Placeholder`): a tinted block with the record's initials where its photo will go, decorative and hidden from screen readers. A full-width 3:1 strip; from `xl` a square beside the sections, so nothing shifts when photos arrive.
3. **Name** (`RecordName`): the `h1`, with the status line under it (below), when the record has a Status History.
4. **Details** (`Section` with `Facts`): the record's own facts, one labelled row each. For a Park, its country (coordinates join it with #34).
5. **Lists and histories**, each a `Section` ruled off from the one above with its count beside the title (none when empty, where the quiet note says so). For a Park: Areas as chips, then Status History and Name History side by side from `md`, as compact tables (`HistoryTable`) in the order saved (ADR 0010).

* Dates go through `PartialDate`, which shows a Partial Date at its precision and an unknown one as "Unknown"; a Status through `StatusName`, its dot beside its name.
* An empty section keeps its heading and says so with a quiet note (`EmptyNote`), e.g. `No Areas yet.`, so the sheet's shape never changes.

## Status line

One line under a record's name saying what it is now and since when, worked out from its Status History by `statusLine` (`src/lib/status.ts`). The Park page uses it, and the Preview Card (#43) will; never word it by hand. Entries are read in the order saved, the last one current:

* **Operating ever since it first operated**: "Operating since 1980", the date it first operated.
* **Operating again after any other Status**: "Reopened 2005, originally opened 1971": its latest operating entry, then when it first operated. Any Status but operating (refurbishing and SBNO included) is closed in effect, since nobody could ride or visit; only Statuses after it first operated count.
* **Another ongoing Status** (refurbishing, SBNO, under construction, announced): "Refurbishing since April 2025, opened 1979".
* **A final Status** (closed, demolished, relocated), without "since": "Demolished 2009, opened 1971".
* **Never operated**: the current Status alone, with no opening, e.g. "Under construction since 2024".
* An entry with no date drops its date part ("Demolished, opened 1971"; an undated first opening drops ", opened ..." altogether). No Status History, no line.
* Dates are Partial Dates at their own precision, never padded (ADR 0010). The line is plain muted text; a Status's dot belongs to `StatusName`, not here.

## Editing in place

Not built yet; Accounts and Review build it to this pattern, rather than separate forms.

* Every fact on a sheet has a pencil. Editing it shows the current value struck through beside the suggestion, for a Moderator to review. Until Review exists, edits go live immediately.
* **Name**: the pencil asks "It was renamed" (adds a Name History entry, prefilled with the current name) or "Fix a mistake" (corrects the last entry).
* **Status**: "The Status changed" (adds a Status History entry, with the new Status left empty) or "Fix the current one" (replaces the last entry).

## Accessibility bar

WCAG 2.2 AA, in light and dark.

* Landmarks (`banner`, `nav` with a label, `main`, `contentinfo`) and one `h1` per page, with headings in order.
* Every interactive element reachable by keyboard and visibly focused; the global focus ring uses `ring`.
* Text and controls meet AA contrast in both themes; check new tokens in both.
* Never convey meaning by colour alone (e.g. a Status dot has its name beside it).

## Tests

* `just test-e2e` runs Playwright with axe. It starts Postgres, empties a `padb_e2e` database, and runs an API and website of their own (ports 3197 to 3199), so it never touches dev data or tests another checkout's running site. Put specs in `apps/website/e2e`.
* Add the data a page needs with `addPark` from `e2e/seed.ts`, through the internal API. Names get a random suffix, so tests can run in parallel; never rely on the database being empty.
* Every page gets `expectShell` and an axe check in light and dark with `expectAccessible`, both from `e2e/expectations.ts`; set the theme with `page.emulateMedia({ colorScheme })`.
* `just test-unit` runs Vitest on `src/**/*.test.ts`, for pure functions.
* Test what a person sees (roles, names, text), never markup or class names. No screenshot comparisons.
