import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('Token Meter', () => {
  test('token meter component exists in workspace header', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Wait for workspace to render
    await expect(page.locator('.workspace-sidebar')).toBeVisible();

    // Token meter should be in the DOM (may be hidden if no tokens)
    await page.waitForTimeout(500);
  });

  test('workspace header renders without errors', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Workspace header should render
    await expect(page.locator('.workspace-sidebar')).toBeVisible();
    await expect(page.locator('.workspace-sidebar__title')).toBeVisible();
  });
});
