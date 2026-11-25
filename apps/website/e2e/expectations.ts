import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

// The accessibility bar: WCAG 2.2 AA, which includes every A and AA rule from 2.0 and 2.1.
const wcag22aa = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

/** Fails on any WCAG 2.2 AA violation axe finds on the page as it stands. */
export async function expectAccessible(page: Page) {
    const { violations } = await new AxeBuilder({ page }).withTags(wcag22aa).analyze();
    expect(violations.map(({ id, help, nodes }) => ({ id, help, targets: nodes.map(node => node.target) }))).toEqual(
        [],
    );
}

/** The shell every page sits in: header with wordmark and nav, the sheet, and the footer's source link. */
export async function expectShell(page: Page) {
    const header = page.getByRole('banner');
    await expect(header.getByRole('link', { name: 'PADB' })).toHaveAttribute('href', '/');
    await expect(header.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Parks' })).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('contentinfo').getByRole('link', { name: /^Source/ })).toHaveAttribute(
        'href',
        /^https:\/\/github\.com\/thepadb\/padb/,
    );
}
