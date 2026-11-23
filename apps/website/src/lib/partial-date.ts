const partialDateFormats = [
    new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone: 'UTC' }),
    new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'long', timeZone: 'UTC' }),
    new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }),
];

/** A Partial Date (`2022`, `2022-11` or `2022-11-06`) in English at its own precision, never padded. See ADR 0010 */
export function partialDateName(date: string): string {
    const parts = date.split('-').map(Number);
    const [year, month = 1, day = 1] = parts;
    const utc = new Date(Date.UTC(year, month - 1, day));
    // Date.UTC reads years 0 to 99 as 1900 to 1999
    utc.setUTCFullYear(year);
    return partialDateFormats[parts.length - 1].format(utc);
}
