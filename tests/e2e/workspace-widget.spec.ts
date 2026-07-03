import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('Workspace Widget', () => {
  test('notes widget is visible in sidebar', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Notes widget should be visible
    const widget = page.locator('.workspace-widget');
    await expect(widget).toBeVisible({ timeout: 5000 });
  });

  test('expands and allows typing notes', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Click to expand
    const toggle = page.locator('.workspace-widget__toggle');
    await toggle.click();

    // Should show textarea
    const textarea = page.getByLabel('Workspace notes');
    await expect(textarea).toBeVisible();

    // Type notes
    await textarea.fill('Test notes for this workspace');
    await expect(textarea).toHaveValue('Test notes for this workspace');
  });
});
