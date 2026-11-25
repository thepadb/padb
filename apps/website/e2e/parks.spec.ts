import type { Park } from '@padb/api-client';
import { expect, test } from '@playwright/test';
import { expectAccessible, expectShell } from './expectations';
import { addPark } from './seed';

// The Parks pages in the shell. Their own layout and behaviour are tested by #45 and #48.

const colorSchemes = ['light', 'dark'] as const;

let full: Park;
let empty: Park;

test.beforeAll(async () => {
    full = await addPark({
        name: 'Lakeside Pleasure Gardens',
        country: 'GB',
        status_history: [
            { status: 'operating', began: '1971-05' },
            { status: 'closed', began: '2009' },
        ],
        name_history: [{ name: 'Lakeside Gardens', first_used: '1971-05-29' }],
        areas: [{ name: 'Pier' }, { name: 'Woodland' }],
    });
    empty = await addPark({ name: 'Bare Fields', country: 'FR' });
});

test.describe('the Park page', () => {
    test('sits inside the shell, with its record on the sheet', async ({ page }) => {
        await page.goto(`/parks/${full.id}`);
        const sheet = page.getByRole('main');
        await expect(sheet.getByRole('heading', { level: 1, name: full.name })).toBeVisible();
        await expect(sheet.getByText('United Kingdom')).toBeVisible();
        await expect(sheet.getByRole('listitem').filter({ hasText: 'Woodland' })).toBeVisible();
        await expect(sheet.getByText('Closed from 2009')).toBeVisible();
        await expect(sheet.getByText('Lakeside Gardens, first used 29 May 1971')).toBeVisible();
        await expectShell(page);
    });

    test('says when a Park has nothing recorded yet', async ({ page }) => {
        await page.goto(`/parks/${empty.id}`);
        const sheet = page.getByRole('main');
        await expect(sheet.getByRole('heading', { level: 1, name: empty.name })).toBeVisible();
        await expect(sheet.getByText('No Areas yet.')).toBeVisible();
        await expect(sheet.getByText('No Status History yet.')).toBeVisible();
        await expect(sheet.getByText('No Name History yet.')).toBeVisible();
    });

    test('is not found inside the shell when the Park does not exist', async ({ page }) => {
        const response = await page.goto('/parks/01900000-0000-7000-8000-000000000000');
        expect(response?.status()).toBe(404);
        await expect(page.getByRole('main').getByRole('heading', { level: 1, name: 'Not found' })).toBeVisible();
        await expectShell(page);
    });

    for (const colorScheme of colorSchemes) {
        for (const [which, park] of [
            ['full', () => full],
            ['empty', () => empty],
        ] as const) {
            test(`passes axe in ${colorScheme} for the ${which} Park`, async ({ page }) => {
                await page.emulateMedia({ colorScheme });
                await page.goto(`/parks/${park().id}`);
                await expectAccessible(page);
            });
        }
    }
});

test.describe('the Parks list', () => {
    test('sits inside the shell and links to each Park', async ({ page }) => {
        await page.goto('/parks');
        const sheet = page.getByRole('main');
        await expect(sheet.getByRole('heading', { level: 1, name: 'Parks' })).toBeVisible();
        await sheet.getByRole('link', { name: full.name }).click();
        await expect(page.getByRole('main').getByRole('heading', { level: 1, name: full.name })).toBeVisible();
        await expectShell(page);
    });

    for (const colorScheme of colorSchemes) {
        test(`passes axe in ${colorScheme}`, async ({ page }) => {
            await page.emulateMedia({ colorScheme });
            await page.goto('/parks');
            await expectAccessible(page);
        });
    }
});
