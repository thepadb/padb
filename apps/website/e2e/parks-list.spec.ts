import type { Park } from '@padb/api-client';
import { expect, type Page, test } from '@playwright/test';
import { expectAccessible, expectShell } from './expectations';
import { addPark } from './seed';

// The Parks list on the sheet: F's cards, a country filter kept in the URL, and "Load more".

const pageSize = 50;

const sheet = (page: Page) => page.getByRole('main');
const parkLinks = (page: Page) => sheet(page).getByRole('list', { name: 'Parks' }).getByRole('link');
const countryFilter = (page: Page) => sheet(page).getByRole('combobox', { name: 'Country' });

// The website's server functions, which "Load more" calls
const serverFunctions = (url: URL) => url.pathname.startsWith('/_serverFn');

/** Goes to a path once the page has hydrated, so the filter and "Load more" do something when used. */
async function goHydrated(page: Page, path: string) {
    await page.goto(path);
    await expect(sheet(page).getByRole('button', { name: 'Show' })).toHaveCount(0);
}

/**
 * A page and one Park more in a country no other test uses, oldest first. Seeded by the test itself, since
 * `beforeAll` runs once per worker and would add them again.
 */
async function seedPageAndOne(country: string): Promise<Array<Park>> {
    const added = await Promise.all(
        Array.from({ length: pageSize + 1 }, (_, n) => addPark({ name: `Geyser Gardens ${n}`, country })),
    );
    // Oldest first is ID order, since IDs are UUIDv7. See ADR 0008
    return added.sort((a, b) => a.id.localeCompare(b.id));
}

let norway: Park;

test.beforeAll(async () => {
    norway = await addPark({
        name: 'Fjord Fun Park',
        country: 'NO',
        status_history: [{ status: 'operating', began: '1990' }],
    });
});

test('sits inside the shell and shows each Park as a card with its initials and name', async ({ page }) => {
    await page.goto('/parks?country=NO');
    await expect(sheet(page).getByRole('heading', { level: 1, name: 'Parks' })).toBeVisible();
    const card = parkLinks(page).filter({ hasText: norway.name });
    await expect(card).toHaveCount(1);
    await expect(card.getByText('FF', { exact: true })).toBeVisible();
    await expect(card).toContainText('Norway');
    await expect(card).toContainText('Operating');
    await card.click();
    await expect(sheet(page).getByRole('heading', { level: 1, name: norway.name })).toBeVisible();
    await expectShell(page);
});

test('narrows the list to a country, kept in the URL', async ({ page }) => {
    await goHydrated(page, '/parks');
    await countryFilter(page).selectOption('NO');
    await expect(page).toHaveURL(/[?&]country=NO(&|$)/);
    await expect(parkLinks(page).filter({ hasText: norway.name })).toHaveCount(1);
    await expect(parkLinks(page).filter({ hasNotText: 'Norway' })).toHaveCount(0);

    await page.reload();
    await expect(countryFilter(page)).toHaveValue('NO');
    await expect(parkLinks(page).filter({ hasNotText: 'Norway' })).toHaveCount(0);

    await countryFilter(page).selectOption('');
    await expect(page).not.toHaveURL(/country=/);
    await expect(parkLinks(page).filter({ hasNotText: 'Norway' }).first()).toBeVisible();
});

test('filters without JavaScript, through the server', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/parks');
    await countryFilter(page).selectOption('NO');
    await sheet(page).getByRole('button', { name: 'Show' }).click();
    await expect(page).toHaveURL(/[?&]country=NO(&|$)/);
    await expect(countryFilter(page)).toHaveValue('NO');
    await expect(parkLinks(page).filter({ hasText: norway.name })).toHaveCount(1);
    await expect(parkLinks(page).filter({ hasNotText: 'Norway' })).toHaveCount(0);
    await context.close();
});

test('says when a country has no Parks', async ({ page }) => {
    await page.goto('/parks?country=AQ');
    await expect(sheet(page).getByText('No Parks in Antarctica yet.')).toBeVisible();
    await expect(parkLinks(page)).toHaveCount(0);
});

test('shows every country for a country it does not know', async ({ page }) => {
    await goHydrated(page, '/parks?country=XX');
    await expect(countryFilter(page)).toHaveValue('');
    await expect(parkLinks(page).first()).toBeVisible();
});

test('"Load more" appends the next page, then goes', async ({ page }) => {
    const parks = await seedPageAndOne('IS');
    await goHydrated(page, '/parks?country=IS');
    await expect(parkLinks(page)).toHaveCount(pageSize);
    await sheet(page).getByRole('button', { name: 'Load more' }).click();
    await expect(parkLinks(page)).toHaveCount(pageSize + 1);
    // Oldest first, each once, the first page unchanged
    await expect(parkLinks(page)).toContainText(parks.map(park => park.name));
    await expect(sheet(page).getByRole('status')).toHaveText('1 more Park loaded.');
    await expect(sheet(page).getByRole('button', { name: 'Load more' })).toHaveCount(0);
    // The button went, so focus moves to the first Park it brought
    await expect(parkLinks(page).last()).toBeFocused();
});

test('starts again from the first page when the country changes', async ({ page }) => {
    await seedPageAndOne('FO');
    await goHydrated(page, '/parks?country=FO');
    await sheet(page).getByRole('button', { name: 'Load more' }).click();
    await expect(parkLinks(page)).toHaveCount(pageSize + 1);
    await countryFilter(page).selectOption('NO');
    await expect(parkLinks(page).filter({ hasNotText: 'Norway' })).toHaveCount(0);
    await countryFilter(page).selectOption('FO');
    await expect(parkLinks(page)).toHaveCount(pageSize);
});

test('says when more Parks could not be loaded, and tries again', async ({ page }) => {
    await seedPageAndOne('GL');
    await goHydrated(page, '/parks?country=GL');
    await page.route(serverFunctions, route => route.abort());
    await sheet(page).getByRole('button', { name: 'Load more' }).click();
    await expect(sheet(page).getByRole('status')).toHaveText('Parks could not be loaded.');
    await expect(parkLinks(page)).toHaveCount(pageSize);
    await page.unroute(serverFunctions);
    await sheet(page).getByRole('button', { name: 'Try again' }).click();
    await expect(parkLinks(page)).toHaveCount(pageSize + 1);
});

for (const colorScheme of ['light', 'dark'] as const) {
    for (const path of ['/parks', '/parks?country=NO', '/parks?country=AQ']) {
        test(`passes axe in ${colorScheme} on ${path}`, async ({ page }) => {
            await page.emulateMedia({ colorScheme });
            await page.goto(path);
            await expectAccessible(page);
        });
    }
}
