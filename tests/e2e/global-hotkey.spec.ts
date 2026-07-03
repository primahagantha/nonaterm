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

    // Should show recording hint
    await expect(page.getByText(/press the key combination/i)).toBeVisible();
  });

  test('clear button removes hotkey', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await page.getByRole('button', { name: /open options menu/i }).click();
    await page.getByRole('tab', { name: /config/i }).click();

    // Set a hotkey first via keyboard
    const hotkeyInput = page.getByLabel('Global hotkey');
    await hotkeyInput.click();
    await page.keyboard.press('Control+Shift+`');

    // Clear button should appear
    const clearBtn = page.getByRole('button', { name: /clear/i });
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    // Input should be empty
    await expect(hotkeyInput).toHaveValue('');
  });
});
