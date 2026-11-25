import { describe, expect, it } from 'vitest';
import { partialDateName } from './partial-date';

describe('partialDateName', () => {
    it.each([
        ['1994', '1994'],
        ['1994-07', 'July 1994'],
        ['1994-07-04', '4 July 1994'],
    ])('names %s at its own precision', (date, name) => {
        expect(partialDateName(date)).toBe(name);
    });

    it('does not read years below 100 as 19xx', () => {
        expect(partialDateName('0079')).toBe('79');
    });
});
