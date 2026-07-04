import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('Open App Button', () => {
  test('open app button exists in pane header', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Wait for terminal pane to render
    await expect(page.locator('.terminal-pane').first()).toBeVisible();

    // Open app button should be visible (quick launch button in pane header)
    await expect(page.getByRole('button', { name: /quick launch/i }).first()).toBeVisible();
  });

  test('clicking open app opens quick launch modal', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await expect(page.locator('.terminal-pane').first()).toBeVisible();

    // Click quick launch button in pane header
    await page.getByRole('button', { name: /quick launch/i }).first().click();

    // Quick launch modal should open
    await expect(page.getByRole('dialog', { name: /quick launch/i })).toBeVisible();
  });
});
