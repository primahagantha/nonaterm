import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test('grid splitter is present for 2-pane workspace', async ({ page }) => {
  await mockTauriRuntime(page, defaultMockResponses());
  await page.goto('/');

  // Default workspace (Nonaterm Core) has 2 panes — splitter should be visible
  await expect(page.locator('.terminal-pane').first()).toBeVisible();
  await expect(page.locator('.grid-splitter').first()).toBeVisible();
});
