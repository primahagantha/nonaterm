import { expect, test } from '@playwright/test';

test('app shell renders in browser fallback mode', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.workspace-sidebar__title')).toHaveText('Nonaterm');
  await expect(
    page.getByRole('navigation', { name: 'Workspaces' }),
  ).toBeVisible();
  await expect(page.getByText(/fallback|loading|ready|error/i)).toBeVisible();
  await expect(page.getByLabel('Terminal grid')).toBeVisible();
});
