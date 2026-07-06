import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('Global Hotkey Settings', () => {
  test('global hotkey field is visible in config tab', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Open options menu
    await page.getByRole('button', { name: /open options menu/i }).click();

    // Switch to Config tab
    await page.getByRole('tab', { name: /config/i }).click();

    // Global hotkey field should be visible
    await expect(page.getByLabel('Global hotkey')).toBeVisible();
  });

  test('clicking hotkey field enters recording mode', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await page.getByRole('button', { name: /open options menu/i }).click();
    await page.getByRole('tab', { name: /config/i }).click();

    const hotkeyInput = page.getByLabel('Global hotkey');
    await hotkeyInput.click();

    // Should be focused and ready for input
    await expect(hotkeyInput).toBeFocused();
  });

  test('hotkey input can be cleared', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await page.getByRole('button', { name: /open options menu/i }).click();
    await page.getByRole('tab', { name: /config/i }).click();

    // Set a hotkey first
    const hotkeyInput = page.getByLabel('Global hotkey');
    await hotkeyInput.fill('Ctrl+Shift+`');

    // Clear the input
    await hotkeyInput.fill('');

    // Input should be empty
    await expect(hotkeyInput).toHaveValue('');
  });
});
