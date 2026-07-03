import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('Vertical Tabs', () => {
  test('view mode toggle switches between grid and vertical tabs', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Find view mode toggle button
    const toggle = page.getByLabel('Toggle view mode');
    await expect(toggle).toBeVisible({ timeout: 5000 });

    // Click to switch to vertical tabs
    await toggle.click();

    // Vertical tabs should be visible
    const verticalTabs = page.locator('.vertical-tabs');
    await expect(verticalTabs).toBeVisible({ timeout: 3000 });

    // Click again to switch back to grid
    await toggle.click();

    // Grid should be visible again
    const grid = page.locator('.terminal-grid');
    await expect(grid).toBeVisible({ timeout: 3000 });
  });
});
