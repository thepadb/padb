import { describe, expect, it } from 'vitest';
import { statusTone } from './status';

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
