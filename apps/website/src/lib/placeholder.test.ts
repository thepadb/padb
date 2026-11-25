import { describe, expect, it } from 'vitest';
import { initials, placeholderHue } from './placeholder';

describe('initials', () => {
    it.each([
        ['Alton Towers', 'AT'],
        ['Lakeside Pleasure Gardens', 'LP'],
        ['Port-Aventura', 'PA'],
        ['Parc de la Villette', 'PV'],
        ['Efteling', 'E'],
        ['bare fields', 'B'],
        ['Ébène Parc', 'ÉP'],
    ])('gives %s as %s', (name, expected) => {
        expect(initials(name)).toBe(expected);
    });
});

describe('placeholderHue', () => {
    it('is a hue from 0 to 359', () => {
        for (const name of ['Alton Towers', 'Efteling', 'x', 'Parc Astérix']) {
            const hue = placeholderHue(name);
            expect(Number.isInteger(hue)).toBe(true);
            expect(hue).toBeGreaterThanOrEqual(0);
            expect(hue).toBeLessThan(360);
        }
    });

    it('is the same every time for a name, so the page never changes colour', () => {
        expect(placeholderHue('Alton Towers')).toBe(placeholderHue('Alton Towers'));
    });

    it('differs between names', () => {
        expect(placeholderHue('Alton Towers')).not.toBe(placeholderHue('Thorpe Park'));
    });
});
