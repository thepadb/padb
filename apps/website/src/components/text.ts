// The sheet's text styles, shared so every page reads the same. See docs/agents/design.md

/** A page's `h1`. */
export const pageHeading = 'text-2xl font-semibold sm:text-3xl';

/** A section's `h2` on a sheet. */
export const sectionHeading = 'mt-8 mb-2 text-sm font-semibold';

/** A link in running text: teal and underlined, so it never relies on colour alone. */
export const textLink = 'text-primary underline underline-offset-2 hover:decoration-2';

/** A quiet note, e.g. for a section with no data yet. */
export const quietNote = 'text-sm text-muted-foreground';
