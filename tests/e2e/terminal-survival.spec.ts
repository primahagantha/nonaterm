import { expect, test } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('Terminal survival across workspace switches', () => {
  test('terminal stays visible after switching workspace and back', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Default workspace (Nonaterm Core) should have a terminal pane
    const firstPane = page.locator('.terminal-pane').first();
    await expect(firstPane).toBeVisible({ timeout: 5000 });

    // Should not be in error state
    const status = await firstPane.getAttribute('data-status');
    expect(status).not.toBe('error');

    // Switch to Playground workspace
    const playgroundBtn = page.locator('.workspace-list__select', { hasText: 'Playground' }).first();
    await playgroundBtn.click();
    await page.waitForTimeout(300);

    // Switch back to Nonaterm Core
    const coreBtn = page.locator('.workspace-list__select', { hasText: 'Nonaterm Core' }).first();
    await coreBtn.click();
    await page.waitForTimeout(300);

    // Original pane should still be visible and NOT errored (PTY survived)
    await expect(firstPane).toBeVisible({ timeout: 5000 });
    const statusAfter = await firstPane.getAttribute('data-status');
    expect(statusAfter).not.toBe('error');
  });

  test('rapid workspace switching does not break terminals', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await expect(page.locator('.terminal-pane').first()).toBeVisible();

    const coreBtn = page.locator('.workspace-list__select', { hasText: 'Nonaterm Core' }).first();
    const playgroundBtn = page.locator('.workspace-list__select', { hasText: 'Playground' }).first();

    // Rapid switching: 5 round trips
    for (let i = 0; i < 5; i++) {
      await playgroundBtn.click();
      await page.waitForTimeout(100);
      await coreBtn.click();
      await page.waitForTimeout(100);
    }

    // Terminal should still be visible and not errored after rapid switching
    const firstPane = page.locator('.terminal-pane').first();
    await expect(firstPane).toBeVisible();
    const status = await firstPane.getAttribute('data-status');
    expect(status).not.toBe('error');
  });

  test('all workspace panes render without errors', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Default workspace should have terminal panes visible
    const panes = page.locator('.terminal-pane');
    const count = await panes.count();
    expect(count).toBeGreaterThanOrEqual(2); // At least 2 panes across all workspaces

    // Switch to Playground (2-pane layout)
    const playgroundBtn = page.locator('.workspace-list__select', { hasText: 'Playground' }).first();
    await playgroundBtn.click();

    // Playground panes should be visible (check by workspace health strip)
    await expect(page.locator('.workspace-health').first()).toBeVisible({ timeout: 3000 });
  });
});
