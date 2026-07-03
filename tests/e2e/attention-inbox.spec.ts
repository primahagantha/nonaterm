import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('Attention Inbox', () => {
  test('shows when there are errored terminals', async ({ page }) => {
    await mockTauriRuntime(page, {
      ...defaultMockResponses(),
      pty_spawn: () => {
        throw new Error('PTY spawn failed: synthetic fault');
      },
    });
    await page.goto('/');

    // Wait for terminal to attempt spawn and fail
    await page.waitForTimeout(2000);

    // Attention inbox should be visible
    const inbox = page.locator('.attention-inbox');
    await expect(inbox).toBeVisible({ timeout: 5000 });
  });

  test('does not show when all terminals are healthy', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Wait for terminals to spawn
    await page.waitForTimeout(1000);

    // Attention inbox should not be visible
    const inbox = page.locator('.attention-inbox');
    await expect(inbox).not.toBeVisible();
  });
});
