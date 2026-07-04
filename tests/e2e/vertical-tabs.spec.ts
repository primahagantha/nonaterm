import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('Vertical Tabs', () => {
  test('view mode toggle switches between grid and vertical tabs', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Find view mode toggle button
    const toggle = page.getByLabel('Toggle view mode');
    await expect(toggle).toBeVisible({ timeout: 5000 });

    // Default is grid mode — terminal grid should be visible
    await expect(page.locator('.terminal-grid').first()).toBeVisible();

    // Click to switch to vertical tabs
    await toggle.click();

    // Vertical tabs should be visible
    await expect(page.locator('.vertical-tabs').first()).toBeVisible({ timeout: 3000 });

    // Click again to switch back to grid
    await toggle.click();

    // Grid should be visible again
    await expect(page.locator('.terminal-grid').first()).toBeVisible({ timeout: 3000 });
  });
});
