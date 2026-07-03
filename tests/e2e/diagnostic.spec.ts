import { test, expect } from '@playwright/test';

test('diagnostic: terminal pane shell scaffolding is present', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.terminal-pane').first()).toBeVisible();
  await expect(page.locator('.terminal-pane__title').first()).toBeVisible();
});
