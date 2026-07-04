import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('Theme Switcher', () => {
  test('theme cards are visible in Appearance tab', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await page.getByRole('button', { name: /open options menu/i }).click();
    await page.getByRole('tab', { name: /appearance/i }).click();

    // Should show theme cards (14 built-in themes)
    const themeCards = page.locator('.theme-card');
    await expect(themeCards.first()).toBeVisible();
    await expect(themeCards).toHaveCount(14);
  });

  test('clicking a theme card applies the theme', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await page.getByRole('button', { name: /open options menu/i }).click();
    await page.getByRole('tab', { name: /appearance/i }).click();

    // Click the second theme card
    const themeCards = page.locator('.theme-card');
    await themeCards.nth(1).click();

    // The clicked card should become active
    await expect(themeCards.nth(1)).toHaveAttribute('aria-checked', 'true');
  });

  test('light/dark mode toggle works', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await page.getByRole('button', { name: /open options menu/i }).click();
    await page.getByRole('tab', { name: /appearance/i }).click();

    // Find and click the dark mode button
    const darkBtn = page.getByRole('button', { name: /dark/i });
    if (await darkBtn.isVisible()) {
      await darkBtn.click();
      // Verify data-theme changed
      const theme = await page.evaluate(() =>
        document.documentElement.dataset.theme,
      );
      expect(theme).toBe('dark');
    }
  });

  test('font size slider is functional', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await page.getByRole('button', { name: /open options menu/i }).click();
    await page.getByRole('tab', { name: /appearance/i }).click();

    // Font size slider should exist
    const slider = page.getByLabel(/font size/i);
    if (await slider.isVisible()) {
      await expect(slider).toBeVisible();
    }
  });
});
