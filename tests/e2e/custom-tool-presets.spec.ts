import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('Custom Tool Presets', () => {
  test('app loads without errors', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Wait for sidebar to render
    await expect(page.locator('.workspace-sidebar')).toBeVisible();
  });
});
