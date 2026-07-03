import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test('workspace CRUD controls work in browser mode', async ({ page }) => {
  await mockTauriRuntime(page, defaultMockResponses());
  await page.goto('/');

  const initialCount = await page.locator('.workspace-list__select').count();

  // Click "New Workspace" button which creates workspace instantly
  await page.getByRole('button', { name: /New Workspace/ }).click();

  // The new workspace should appear with inline rename active
  const renameInput = page.locator('.workspace-list__rename').last();
  await expect(renameInput).toBeVisible();

  // Type a new name and press Enter
  await renameInput.fill('Public Demo Workspace');
  await renameInput.press('Enter');
  await expect(
    page.locator('.workspace-list__select', { hasText: 'Public Demo Workspace' }),
  ).toBeVisible();
  // Wait for the rename input to be gone (select restored).
  await expect(page.locator('.workspace-list__rename')).toHaveCount(0);

  // Delete the new workspace and assert count returns to initial.
  const deleteButtons = page.locator('button[title="Delete permanently"]:not([disabled])');
  await deleteButtons.last().click({ force: true });

  // Confirm the deletion in the dialog
  const confirmDialog = page.getByRole('alertdialog', { name: 'Delete workspace?' });
  await expect(confirmDialog).toBeVisible();
  await confirmDialog.getByRole('button', { name: 'Delete' }).click();

  await expect(page.locator('.workspace-list__select')).toHaveCount(
    initialCount,
  );
});
