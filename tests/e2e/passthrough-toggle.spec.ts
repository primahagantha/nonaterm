import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('Passthrough Mode Toggle', () => {
  test('toggle button is visible in pane header', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Wait for terminal pane to render
    await expect(page.locator('.terminal-pane').first()).toBeVisible();

    // Passthrough toggle button should be visible
    const toggleBtn = page.getByRole('button', { name: /toggle passthrough/i }).first();
    await expect(toggleBtn).toBeVisible();
  });

  test('clicking toggle activates passthrough mode', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await expect(page.locator('.terminal-pane').first()).toBeVisible();

    const toggleBtn = page.getByRole('button', { name: /toggle passthrough/i }).first();
    await toggleBtn.click();

    // Should show passthrough indicator
    await expect(page.getByText(/Passthrough Mode/).first()).toBeVisible();
  });

  test('passthrough indicator shows exit button', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await expect(page.locator('.terminal-pane').first()).toBeVisible();

    // Activate passthrough
    const toggleBtn = page.getByRole('button', { name: /toggle passthrough/i }).first();
    await toggleBtn.click();

    // Should show exit button
    const exitBtn = page.getByRole('button', { name: /exit passthrough/i }).first();
    await expect(exitBtn).toBeVisible();
  });

  test('clicking exit button deactivates passthrough mode', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await expect(page.locator('.terminal-pane').first()).toBeVisible();

    // Activate passthrough
    const toggleBtn = page.getByRole('button', { name: /toggle passthrough/i }).first();
    await toggleBtn.click();

    // Click exit
    const exitBtn = page.getByRole('button', { name: /exit passthrough/i }).first();
    await exitBtn.click();

    // Passthrough indicator should be gone
    await expect(page.getByText(/Passthrough Mode/).first()).not.toBeVisible();
  });

  test('pane has passthrough CSS class when active', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await expect(page.locator('.terminal-pane').first()).toBeVisible();

    const toggleBtn = page.getByRole('button', { name: /toggle passthrough/i }).first();
    await toggleBtn.click();

    // Pane should have passthrough class
    const pane = page.locator('.terminal-pane--passthrough').first();
    await expect(pane).toBeVisible();
  });
});
