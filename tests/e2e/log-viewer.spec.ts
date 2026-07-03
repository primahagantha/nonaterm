import { test, expect } from '@playwright/test';
import {
  defaultMockResponses,
  mockLogLines,
  mockTauriRuntime,
  sampleLogLines,
} from './helpers';

test.describe('Log viewer', () => {
  test('toggle expands panel and shows empty state (non-Tauri)', async ({
    page,
  }) => {
    await page.goto('/');

    const toggle = page.locator('.log-viewer__toggle');
    await toggle.click();

    await expect(page.locator('.log-viewer__panel')).toBeVisible();
    await expect(page.getByText('No log entries.')).toBeVisible();
  });

  test('level filter dropdown is visible when expanded', async ({ page }) => {
    await page.goto('/');

    await page.locator('.log-viewer__toggle').click();

    const select = page.locator('.log-viewer__filter select');
    await expect(select).toBeVisible();

    const options = select.locator('option');
    const optionTexts = await options.allTextContents();
    expect(optionTexts).toContain('ALL');
    expect(optionTexts).toContain('ERROR');
    expect(optionTexts).toContain('WARN');
    expect(optionTexts).toContain('INFO');
    expect(optionTexts).toContain('DEBUG');
  });

  test('refresh button is visible and clickable', async ({ page }) => {
    await page.goto('/');

    await page.locator('.log-viewer__toggle').click();

    const refreshBtn = page.getByRole('button', { name: 'Refresh' });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
  });

  test('log lines display in Tauri mock mode', async ({ page }) => {
    await mockTauriRuntime(
      page,
      defaultMockResponses(mockLogLines(sampleLogLines())),
    );
    await page.goto('/');

    await page.locator('.log-viewer__toggle').click();

    await expect(page.getByText('Application started')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('PTY buffer near limit')).toBeVisible();
    await expect(page.getByText('Failed to save snapshot')).toBeVisible();
  });

  test('level filter changes selected value', async ({ page }) => {
    await mockTauriRuntime(
      page,
      defaultMockResponses(mockLogLines(sampleLogLines())),
    );
    await page.goto('/');

    await page.locator('.log-viewer__toggle').click();

    const select = page.locator('.log-viewer__filter select');
    await select.selectOption('ERROR');

    await expect(select).toHaveValue('ERROR');
  });
});
