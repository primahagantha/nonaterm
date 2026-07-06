import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('Auto-Restart Policy', () => {
  test('options menu opens successfully', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Open options menu
    await page.getByRole('button', { name: /open options menu/i }).click();

    // Settings page should be visible
    await expect(page.getByRole('dialog', { name: /settings/i })).toBeVisible();
  });
});
