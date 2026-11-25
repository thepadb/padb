import { expect, test } from '@playwright/test';
import { expectAccessible, expectShell } from './expectations';

const pages = [
    { name: 'home', path: '/', heading: 'Parks & Attractions Database' },
    { name: 'not found', path: '/no-such-page', heading: 'Not found' },
];

for (const { name, path, heading } of pages) {
    test.describe(`the ${name} page`, () => {
        test('sits inside the shell', async ({ page }) => {
            await page.goto(path);
            await expect(page.getByRole('main').getByRole('heading', { level: 1, name: heading })).toBeVisible();
            await expectShell(page);
        });

        for (const colorScheme of ['light', 'dark'] as const) {
            test(`passes axe in ${colorScheme}`, async ({ page }) => {
                await page.emulateMedia({ colorScheme });
                await page.goto(path);
                await expectAccessible(page);
            });
        }
    });
}

test('the not found page answers 404 and leads home', async ({ page }) => {
    const response = await page.goto('/no-such-page');
    expect(response?.status()).toBe(404);
    await page.getByRole('main').getByRole('link', { name: 'Go to the home page' }).click();
    await expect(page).toHaveURL('/');
});

test('the theme follows the operating system', async ({ page }) => {
    const sheetColour = () => page.getByRole('main').evaluate(main => getComputedStyle(main).backgroundColor);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const light = await sheetColour();
    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await sheetColour()).not.toBe(light);
});

test('the skip link moves focus to the sheet', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await skip.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
});
