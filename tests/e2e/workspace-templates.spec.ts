import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('Workspace Templates', () => {
  test('templates panel shows available templates', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Open options menu
    await page.getByRole('button', { name: /open options menu/i }).click();

    // Switch to Templates tab
    await page.getByRole('tab', { name: /templates/i }).click();

    // Should show template cards
    await expect(page.getByText('Blank')).toBeVisible();
    await expect(page.getByText('Frontend dev')).toBeVisible();
    await expect(page.getByText('Full-stack')).toBeVisible();
  });

  test('clicking "Use template" materializes a workspace', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await page.getByRole('button', { name: /open options menu/i }).click();
    await page.getByRole('tab', { name: /templates/i }).click();

    // Click "Use template" on the first template
    const useButtons = page.getByRole('button', { name: /use template/i });
    await useButtons.first().click();

    // Should close the options menu and show the new workspace
    await expect(page.getByRole('button', { name: /open options menu/i })).toBeVisible();
  });

  test('templates panel shows empty state when no templates', async ({ page }) => {
    await mockTauriRuntime(
      page,
      defaultMockResponses({ templates_list: [] }),
    );
    await page.goto('/');

    await page.getByRole('button', { name: /open options menu/i }).click();
    await page.getByRole('tab', { name: /templates/i }).click();

    // Should show empty state
    await expect(page.getByText(/no templates/i)).toBeVisible();
  });
});
