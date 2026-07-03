import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('Search Scrollback', () => {
  test('search bar appears on Ctrl+F', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Wait for terminal to render
    await expect(page.locator('.terminal-pane').first()).toBeVisible();

    // Press Ctrl+F
    await page.keyboard.press('Control+f');

    // Search bar should appear
    await expect(page.getByLabel('Search terminal').first()).toBeVisible();
  });

  test('search bar has close button', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await expect(page.locator('.terminal-pane').first()).toBeVisible();
    await page.keyboard.press('Control+f');

    const closeBtn = page.getByRole('button', { name: /close search/i }).first();
    await expect(closeBtn).toBeVisible();
  });

  test('search bar has placeholder text', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await expect(page.locator('.terminal-pane').first()).toBeVisible();
    await page.keyboard.press('Control+f');

    const searchInput = page.getByLabel('Search terminal').first();
    await expect(searchInput).toHaveAttribute('placeholder', 'Search…');
  });
});
