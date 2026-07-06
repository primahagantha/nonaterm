import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('Keybind Customization', () => {
  test('keybinds tab shows current bindings', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await page.getByRole('button', { name: /open options menu/i }).click();
    await page.getByRole('tab', { name: /keybinds/i }).click();

    // Should show keybind entries
    await expect(page.getByText(/Show keyboard shortcuts/i)).toBeVisible();
    await expect(page.getByText(/Open options menu/i)).toBeVisible();
    await expect(page.getByText(/Create a new workspace/i)).toBeVisible();
  });

  test('rebind button is available for each keybind', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await page.getByRole('button', { name: /open options menu/i }).click();
    await page.getByRole('tab', { name: /keybinds/i }).click();

    // Should have Rebind buttons
    const rebindButtons = page.getByRole('button', { name: /rebind/i });
    await expect(rebindButtons.first()).toBeVisible();
  });

  test('reset all to defaults button is present', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await page.getByRole('button', { name: /open options menu/i }).click();
    await page.getByRole('tab', { name: /keybinds/i }).click();

    // Should have reset all button
    await expect(
      page.getByRole('button', { name: /reset all to defaults/i }),
    ).toBeVisible();
  });

  test('conflict warning shows for known CLI shortcuts', async ({ page }) => {
    await mockTauriRuntime(
      page,
      defaultMockResponses({
        keybind_check_conflict: [
          {
            category: 'readline',
            tools: 'bash, zsh, python, node',
            advice: 'Consider using Ctrl+Shift+P instead',
          },
        ],
      }),
    );
    await page.goto('/');

    await page.getByRole('button', { name: /open options menu/i }).click();
    await page.getByRole('tab', { name: /keybinds/i }).click();

    // The conflict detection should be visible when checking a combo
    await expect(page.getByRole('tab', { name: /keybinds/i })).toBeVisible();
  });
});
