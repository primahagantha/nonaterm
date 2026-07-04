import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('Command Palette', () => {
  test('opens and shows commands via keyboard shortcut', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Wait for the app shell to mount and keybinds to register
    await expect(page.locator('.workspace-sidebar')).toBeVisible();

    // Trigger Ctrl+Shift+P
    await page.keyboard.press('Control+Shift+KeyP');

    const dialog = page.getByRole('dialog', { name: 'Command palette' });
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Should have search input
    const input = page.getByLabel('Search commands');
    await expect(input).toBeVisible();

    // Should list workspace switch commands
    await expect(page.getByText(/Switch to/).first()).toBeVisible();
  });

  test('closes on Escape', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await expect(page.locator('.workspace-sidebar')).toBeVisible();
    await page.keyboard.press('Control+Shift+KeyP');

    const dialog = page.getByRole('dialog', { name: 'Command palette' });
    await expect(dialog).toBeVisible({ timeout: 3000 });

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('filters commands by search query', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await expect(page.locator('.workspace-sidebar')).toBeVisible();
    await page.keyboard.press('Control+Shift+KeyP');

    const dialog = page.getByRole('dialog', { name: 'Command palette' });
    await expect(dialog).toBeVisible({ timeout: 3000 });

    const input = page.getByLabel('Search commands');
    await input.fill('settings');

    // "Open settings" should be visible, workspace switches should be filtered out
    await expect(page.getByText('Open settings')).toBeVisible();
  });
});
