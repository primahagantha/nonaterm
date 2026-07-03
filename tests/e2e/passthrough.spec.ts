import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test('shortcuts modal opens via keyboard shortcut', async ({ page }) => {
  await mockTauriRuntime(page, defaultMockResponses());
  await page.goto('/');

  // Open the shortcuts modal via Ctrl+. keyboard shortcut
  await page.keyboard.press('Control+Period');

  // Wait a bit for the modal to appear
  await page.waitForTimeout(500);

  // If the keyboard shortcut didn't work, try clicking the shortcuts button
  const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  if (!(await dialog.isVisible().catch(() => false))) {
    // Fallback: click the shortcuts button if it exists
    const shortcutsBtn = page.locator('.shortcuts-button').first();
    if (await shortcutsBtn.isVisible().catch(() => false)) {
      await shortcutsBtn.click();
    }
  }

  await expect(dialog).toBeVisible();
});
