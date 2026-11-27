import { describe, expect, test } from 'vitest';
import { countries, flag, isCountry } from './country';

describe('isCountry', () => {
    test('accepts an officially assigned code', () => {
        expect(isCountry('GB')).toBe(true);
        expect(isCountry('AQ')).toBe(true);
    });

    test('refuses codes the API refuses', () => {
        for (const code of ['XX', 'XK', 'UK', 'gb', 'GBR', '']) {
            expect(isCountry(code)).toBe(false);
        }
    });
});

describe('countries', () => {
    test('holds every officially assigned code once', () => {
        expect(countries).toHaveLength(249);
        expect(new Set(countries.map(country => country.code)).size).toBe(249);
    });

    test('runs in order of English name, as people look for them', () => {
        const names = countries.map(country => country.name);
        expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en-GB')));
        expect(countries.find(country => country.code === 'GB')?.name).toBe('United Kingdom');
    });
});

describe('flag', () => {
    test("is the country's flag emoji, from its code's regional indicators", () => {
        expect(flag('GB')).toBe('🇬🇧');
        expect(flag('NO')).toBe('🇳🇴');
    });
});
