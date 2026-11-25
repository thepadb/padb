import type { Park } from '@padb/api-client';
import { expect, type Page, test } from '@playwright/test';
import { expectAccessible } from './expectations';
import { addPark } from './seed';

// The browse tree beside the sheet. Its Parks come a page of 50 at a time, oldest first.

const pageSize = 50;

const tree = (page: Page) => page.getByRole('navigation', { name: 'Browse' });
const parkLinks = (page: Page) => tree(page).getByRole('list', { name: 'Parks' }).getByRole('link');
const highlighted = (page: Page) => tree(page).locator('[aria-current="page"]');

// The website's server functions, which "Load more" calls
const serverFunctions = (url: URL) => url.pathname.startsWith('/_serverFn');

let beyond: Park;

test.beforeAll(async () => {
    // More than a page, whatever else the run adds
    await Promise.all(
        Array.from({ length: pageSize + 1 }, (_, n) => addPark({ name: `Tree Park ${n}`, country: 'GB' })),
    );
    // Added after a full page of others, so it is never on the first page
    beyond = await addPark({ name: 'Far Tree Park', country: 'GB' });
});

for (const path of ['/', '/parks', '/no-such-page']) {
    test(`shows on ${path} with the first page of Parks from the server`, async ({ browser }) => {
        // Without JavaScript, only what the server rendered is there
        const context = await browser.newContext({ javaScriptEnabled: false });
        const page = await context.newPage();
        await page.goto(path);
        await expect(parkLinks(page)).toHaveCount(pageSize);
        await context.close();
    });
}

test('"Load more" appends the next page', async ({ page }) => {
    await page.goto('/');
    const first = await parkLinks(page).allTextContents();
    await tree(page).getByRole('button', { name: 'Load more' }).click();
    await expect(parkLinks(page)).not.toHaveCount(pageSize);
    const after = await parkLinks(page).allTextContents();
    expect(after.slice(0, pageSize)).toEqual(first);
    expect(new Set(after).size).toBe(after.length);
});

test('highlights the Park being viewed, and keeps loaded Parks as you move between them', async ({ page }) => {
    await page.goto('/');
    await tree(page).getByRole('button', { name: 'Load more' }).click();
    const later = parkLinks(page).nth(pageSize);
    const name = await later.textContent();
    await later.click();
    await expect(page.getByRole('main').getByRole('heading', { level: 1, name: name ?? '' })).toBeVisible();
    await expect(parkLinks(page).nth(pageSize)).toHaveAttribute('aria-current', 'page');
    await expect(highlighted(page)).toHaveCount(1);
});

test('shows and highlights a Park beyond the loaded pages, by ID alone, once', async ({ browser }) => {
    // Rendered by the server, with the rest of the tree
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`/parks/${beyond.id}`);
    await expect(parkLinks(page)).toHaveCount(pageSize + 1);
    await expect(parkLinks(page).last()).toHaveText(beyond.name);
    await expect(parkLinks(page).last()).toHaveAttribute('aria-current', 'page');
    await context.close();
});

test('keeps a Park beyond the loaded pages once as more load', async ({ page }) => {
    await page.goto(`/parks/${beyond.id}`);
    const loadMore = tree(page).getByRole('button', { name: 'Load more' });
    await loadMore.click();
    await expect(parkLinks(page)).not.toHaveCount(pageSize + 1);
    await expect(tree(page).getByRole('link', { name: beyond.name })).toHaveCount(1);
    await expect(tree(page).getByRole('link', { name: beyond.name })).toHaveAttribute('aria-current', 'page');
});

test('says when Parks could not be loaded, and tries again', async ({ page }) => {
    await page.goto('/');
    await page.route(serverFunctions, route => route.abort());
    await tree(page).getByRole('button', { name: 'Load more' }).click();
    await expect(tree(page).getByRole('status')).toHaveText('Parks could not be loaded.');
    await expect(parkLinks(page)).toHaveCount(pageSize);
    await expectAccessible(page);
    await page.unroute(serverFunctions);
    await tree(page).getByRole('button', { name: 'Try again' }).click();
    await expect(parkLinks(page)).not.toHaveCount(pageSize);
    await expect(tree(page).getByRole('status')).toHaveText(/more Parks loaded/);
});

test('can be used with a keyboard', async ({ page }) => {
    await page.goto('/');
    const loadMore = tree(page).getByRole('button', { name: 'Load more' });
    await loadMore.focus();
    await page.keyboard.press('Enter');
    await expect(parkLinks(page)).not.toHaveCount(pageSize);
    await expect(loadMore).toBeFocused();
    const link = parkLinks(page).first();
    await link.focus();
    const name = await link.textContent();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main').getByRole('heading', { level: 1, name: name ?? '' })).toBeVisible();
});

test('is hidden on narrow screens, leaving the sheet the full width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(tree(page)).toBeHidden();
});

for (const colorScheme of ['light', 'dark'] as const) {
    test(`passes axe in ${colorScheme}, with a Park highlighted`, async ({ page }) => {
        await page.emulateMedia({ colorScheme });
        await page.goto(`/parks/${beyond.id}`);
        await expect(highlighted(page)).toHaveCount(1);
        await expectAccessible(page);
    });
}
