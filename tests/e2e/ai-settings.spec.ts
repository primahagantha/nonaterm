import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('AI Settings', () => {
  test('AI tab exists in options menu', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Open options menu
    await page.getByRole('button', { name: /open options menu/i }).click();

    // AI tab should be visible
    await expect(page.getByRole('tab', { name: 'AI' })).toBeVisible();
  });
});
