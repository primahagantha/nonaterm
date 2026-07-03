import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('Open App Button', () => {
  test('open app button exists in pane header', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Wait for terminal pane to render
    await expect(page.locator('.terminal-pane').first()).toBeVisible();

    // Open app button should be visible
    await expect(page.getByRole('button', { name: /open app/i }).first()).toBeVisible();
  });

  test('clicking open app opens quick launch modal', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await expect(page.locator('.terminal-pane').first()).toBeVisible();

    // Click open app button
    await page.getByRole('button', { name: /open app/i }).first().click();

    // Quick launch modal should open
    await expect(page.getByRole('dialog', { name: /quick launch/i })).toBeVisible();
  });
});
