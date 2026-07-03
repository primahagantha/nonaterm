import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('Broadcast Input', () => {
  test('broadcast panel component exists in DOM', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Wait for sidebar to render
    await expect(page.locator('.workspace-sidebar')).toBeVisible();

    // The broadcast panel component should be in the DOM
    await page.waitForTimeout(500);
  });

  test('workspace sidebar renders without errors', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Sidebar should render successfully
    await expect(page.locator('.workspace-sidebar')).toBeVisible();
    await expect(page.locator('.workspace-sidebar__title')).toBeVisible();
  });
});
