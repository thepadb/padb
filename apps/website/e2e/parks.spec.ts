import type { Park } from '@padb/api-client';
import { expect, test } from '@playwright/test';
import { expectAccessible, expectShell } from './expectations';
import { addPark } from './seed';

// The Park page in the shell. The Parks list is tested in parks-list.spec.ts.

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
            { status: 'demolished', began: null },
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
        const crumbs = sheet.getByRole('navigation', { name: 'Breadcrumb' });
        await expect(crumbs.getByRole('link', { name: 'Parks' })).toHaveAttribute('href', '/parks');
        await expect(crumbs.getByText(full.name)).toHaveAttribute('aria-current', 'page');
        await expect(sheet.getByRole('heading', { level: 1, name: full.name })).toBeVisible();
        await expect(sheet.getByRole('term').filter({ hasText: 'Country' })).toBeVisible();
        await expect(sheet.getByRole('definition').filter({ hasText: 'United Kingdom' })).toBeVisible();
        await expect(sheet.getByRole('listitem').filter({ hasText: 'Woodland' })).toBeVisible();
        await expectShell(page);
    });

    test('shows breadcrumbs, the placeholder, the name, then each section, in that order', async ({ page }) => {
        // One column, so the order on screen is the reading order
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(`/parks/${full.id}`);
        const sheet = page.getByRole('main');
        const inOrder = [
            sheet.getByRole('navigation', { name: 'Breadcrumb' }),
            sheet.getByText('LP', { exact: true }),
            sheet.getByRole('heading', { level: 1 }),
            sheet.getByRole('heading', { level: 2, name: 'Details' }),
            sheet.getByRole('heading', { level: 2, name: /^Areas/ }),
            sheet.getByRole('heading', { level: 2, name: /^Status History/ }),
            sheet.getByRole('heading', { level: 2, name: /^Name History/ }),
        ];
        const tops = await Promise.all(
            inOrder.map(async block => {
                await expect(block).toBeVisible();
                return (await block.boundingBox())?.y ?? Number.NaN;
            }),
        );
        expect(tops).toEqual([...tops].sort((a, b) => a - b));
        expect(new Set(tops).size).toBe(tops.length);
    });

    test('shows Partial Dates at their own precision, unpadded, in the order saved', async ({ page }) => {
        await page.goto(`/parks/${full.id}`);
        const sheet = page.getByRole('main');
        const statuses = sheet.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'From' }) });
        const statusRows = statuses.getByRole('row');
        await expect(statusRows).toHaveCount(4);
        await expect(statusRows.nth(1).getByRole('cell')).toHaveText(['Operating', 'May 1971']);
        await expect(statusRows.nth(2).getByRole('cell')).toHaveText(['Closed', '2009']);
        await expect(statusRows.nth(3).getByRole('cell')).toHaveText(['Demolished', 'Unknown']);
        const names = sheet.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'First used' }) });
        await expect(names.getByRole('row').nth(1).getByRole('cell')).toHaveText(['Lakeside Gardens', '29 May 1971']);
    });

    test('says under the name what the Park is now and since when', async ({ page }) => {
        // Rules for every Status History are unit tested with statusLine
        await page.goto(`/parks/${full.id}`);
        const name = page.getByRole('main').getByRole('heading', { level: 1, name: full.name });
        const line = page.getByRole('main').getByText('Demolished, opened May 1971', { exact: true });
        await expect(line).toBeVisible();
        const [nameBox, lineBox] = await Promise.all([name.boundingBox(), line.boundingBox()]);
        expect(lineBox?.y ?? Number.NaN).toBeGreaterThanOrEqual(
            (nameBox?.y ?? Number.NaN) + (nameBox?.height ?? Number.NaN),
        );
    });

    test('says when a Park has nothing recorded yet', async ({ page }) => {
        await page.goto(`/parks/${empty.id}`);
        const sheet = page.getByRole('main');
        await expect(sheet.getByRole('heading', { level: 1, name: empty.name })).toBeVisible();
        await expect(sheet.getByRole('definition').filter({ hasText: 'France' })).toBeVisible();
        await expect(sheet.getByText('No Areas yet.')).toBeVisible();
        await expect(sheet.getByText('No Status History yet.')).toBeVisible();
        await expect(sheet.getByText('No Name History yet.')).toBeVisible();
        await expect(sheet.getByRole('table')).toHaveCount(0);
        await expectShell(page);
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
