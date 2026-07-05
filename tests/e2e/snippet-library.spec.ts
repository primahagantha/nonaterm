import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('Snippet Library', () => {
  test('snippets tab exists in Settings', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await page.getByRole('button', { name: /open options menu/i }).click();
    await expect(page.getByRole('tab', { name: 'Snippets' })).toBeVisible();
  });

  test('snippets panel shows empty state', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await page.getByRole('button', { name: /open options menu/i }).click();
    await page.getByRole('tab', { name: 'Snippets' }).click();
    await expect(page.getByText('No snippets saved yet.')).toBeVisible();
  });
});
