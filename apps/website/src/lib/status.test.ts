import type { Status, StatusHistoryEntry } from '@padb/api-client';
import { describe, expect, it } from 'vitest';
import { statusLine, statusTone } from './status';

describe('statusTone', () => {
    it.each([
        ['operating', 'operating'],
        ['under_construction', 'paused'],
        ['refurbishing', 'paused'],
        ['sbno', 'stopped'],
        ['closed', 'stopped'],
        ['demolished', 'stopped'],
        ['announced', 'none'],
        ['relocated', 'none'],
    ] as const)('gives %s the %s tone', (status, tone) => {
        expect(statusTone(status)).toBe(tone);
    });
});

/** A Status History from `[status, began]` pairs, in the order saved. */
const history = (...entries: Array<[Status, string | null]>): Array<StatusHistoryEntry> =>
    entries.map(([status, began]) => ({ status, began }));

describe('statusLine', () => {
    it('gives no line without a Status History', () => {
        expect(statusLine([])).toBeNull();
    });

    describe('operating ever since it first operated', () => {
        it('says since when it first operated', () => {
            expect(statusLine(history(['under_construction', '1978'], ['operating', '1980']))).toBe(
                'Operating since 1980',
            );
        });

        it('takes the first of several operating entries in a row', () => {
            expect(statusLine(history(['operating', '1980'], ['operating', '1995']))).toBe('Operating since 1980');
        });

        it('drops the date when the first operating entry has none', () => {
            expect(statusLine(history(['operating', null]))).toBe('Operating');
        });
    });

    // Closed in effect: nobody could ride or visit, whatever the reason. See docs/agents/design.md
    describe('operating again after any time not operating', () => {
        it.each([
            ['closed', 'Reopened 2005, originally opened 1971'],
            ['sbno', 'Reopened 2005, originally opened 1971'],
            ['refurbishing', 'Reopened 2005, originally opened 1971'],
            ['under_construction', 'Reopened 2005, originally opened 1971'],
        ] as const)('says it reopened after %s', (status, line) => {
            expect(statusLine(history(['operating', '1971'], [status, '1999'], ['operating', '2005']))).toBe(line);
        });

        it('gives the reopening at its own precision', () => {
            expect(statusLine(history(['operating', '1971'], ['sbno', '1999'], ['operating', '2005-06-01']))).toBe(
                'Reopened 1 June 2005, originally opened 1971',
            );
        });

        it('dates the reopening from its latest operating entry', () => {
            expect(
                statusLine(
                    history(
                        ['operating', '1971'],
                        ['closed', '1999'],
                        ['operating', '2005'],
                        ['refurbishing', '2024'],
                        ['operating', '2025'],
                    ),
                ),
            ).toBe('Reopened 2025, originally opened 1971');
        });

        it('ignores time not operating before it first operated', () => {
            expect(statusLine(history(['announced', '1968'], ['sbno', '1970'], ['operating', '1971']))).toBe(
                'Operating since 1971',
            );
        });

        it('drops the reopening date when it has none', () => {
            expect(statusLine(history(['operating', '1971'], ['closed', '1999'], ['operating', null]))).toBe(
                'Reopened, originally opened 1971',
            );
        });

        it('drops the original opening when it has no date', () => {
            expect(statusLine(history(['operating', null], ['closed', '1999'], ['operating', '2005']))).toBe(
                'Reopened 2005',
            );
        });
    });

    describe('another ongoing Status', () => {
        it.each([
            ['refurbishing', 'Refurbishing since April 2025, opened 1979'],
            ['sbno', 'SBNO since April 2025, opened 1979'],
        ] as const)('puts %s first, then when it opened', (status, line) => {
            expect(statusLine(history(['operating', '1979'], [status, '2025-04']))).toBe(line);
        });

        it('drops its date when it has none', () => {
            expect(statusLine(history(['operating', '1979'], ['refurbishing', null]))).toBe(
                'Refurbishing, opened 1979',
            );
        });
    });

    describe('a final Status', () => {
        it.each([
            ['closed', 'Closed 2009, opened 1971'],
            ['demolished', 'Demolished 2009, opened 1971'],
            ['relocated', 'Relocated 2009, opened 1971'],
        ] as const)('gives %s without "since"', (status, line) => {
            expect(statusLine(history(['operating', '1971'], [status, '2009']))).toBe(line);
        });

        it('takes the first opening, even after a reopening', () => {
            expect(
                statusLine(
                    history(['operating', '1971'], ['closed', '1999'], ['operating', '2005'], ['demolished', '2009']),
                ),
            ).toBe('Demolished 2009, opened 1971');
        });

        it('drops its date when it has none', () => {
            expect(statusLine(history(['operating', '1971'], ['closed', '2009'], ['demolished', null]))).toBe(
                'Demolished, opened 1971',
            );
        });

        it('drops the opening when it has no date', () => {
            expect(statusLine(history(['operating', null], ['demolished', '2009']))).toBe('Demolished 2009');
        });
    });

    describe('never operated', () => {
        it.each([
            ['under_construction', 'Under construction since 2024'],
            ['announced', 'Announced since 2024'],
        ] as const)('gives only %s', (status, line) => {
            expect(statusLine(history(['announced', '2023'], [status, '2024']))).toBe(line);
        });

        it('gives a final Status without "since" or an opening', () => {
            expect(statusLine(history(['under_construction', '2020'], ['closed', '2022']))).toBe('Closed 2022');
        });

        it('drops its date when it has none', () => {
            expect(statusLine(history(['under_construction', null]))).toBe('Under construction');
        });
    });
});
