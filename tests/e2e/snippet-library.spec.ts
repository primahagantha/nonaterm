import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('Snippet Library', () => {
  test('snippet panel exists in sidebar', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Wait for sidebar to render
    await expect(page.locator('.workspace-sidebar')).toBeVisible();

    // Snippet panel should be in the DOM
    await expect(page.getByText('Snippets')).toBeVisible();
  });

  test('snippet panel is collapsible', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await expect(page.getByText('Snippets')).toBeVisible();

    // Click to expand
    await page.getByText('Snippets').click();

    // Should show empty state
    await expect(page.getByText('No snippets saved yet.')).toBeVisible();
  });
});
