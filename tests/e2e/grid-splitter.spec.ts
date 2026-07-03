import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test('grid splitter is present for 2-pane workspace', async ({ page }) => {
  await mockTauriRuntime(page, defaultMockResponses());
  await page.goto('/');

  // Click the Playground workspace (second in the list)
  const playgroundBtn = page.locator('.workspace-list__select', { hasText: 'Playground' }).first();
  await playgroundBtn.click();

  await expect(page.locator('.grid-splitter')).toHaveCount(1);
});
