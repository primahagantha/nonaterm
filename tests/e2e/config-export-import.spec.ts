import { test, expect } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('Config export/import', () => {
  test('export button triggers download', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    // Open options + switch to Config tab
    await page.getByRole('button', { name: /open options menu/i }).click();
    await page.getByRole('tab', { name: /config/i }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /^export/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('Nonaterm-config');
    expect(download.suggestedFilename()).toContain('.json');
  });

  test('import file input accepts JSON', async ({ page }) => {
    await mockTauriRuntime(
      page,
      defaultMockResponses({ state_import_config: 1 }),
    );
    await page.goto('/');

    await page.getByRole('button', { name: /open options menu/i }).click();
    await page.getByRole('tab', { name: /config/i }).click();

    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute(
      'accept',
      'application/json,.json',
    );

    const importData = JSON.stringify({
      version: '0.1.0',
      exportedAt: '2026-06-19T00:00:00.000Z',
      activeWorkspaceId: 'workspace-imported',
      workspaces: [
        {
          id: 'workspace-imported',
          name: 'Imported Workspace',
          accentColor: '#22c55e',
          layoutPreset: '1',
          panes: [
            {
              id: 'pane-i1',
              title: 'Imported Pane',
              cwd: '',
              startupCommand: '',
            },
          ],
        },
      ],
    });

    await fileInput.setInputFiles({
      name: 'import.json',
      mimeType: 'application/json',
      buffer: Buffer.from(importData),
    });

    await expect(page.getByText(/Imported 1 workspace/)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('import updates workspace list', async ({ page }) => {
    await mockTauriRuntime(
      page,
      defaultMockResponses({ state_import_config: 1 }),
    );
    await page.goto('/');

    await page.getByRole('button', { name: /open options menu/i }).click();
    await page.getByRole('tab', { name: /config/i }).click();

    const importData = JSON.stringify({
      version: '0.1.0',
      exportedAt: '2026-06-19T00:00:00.000Z',
      activeWorkspaceId: 'workspace-imported',
      workspaces: [
        {
          id: 'workspace-imported',
          name: 'Imported Workspace',
          accentColor: '#22c55e',
          layoutPreset: '1',
          panes: [
            {
              id: 'pane-i1',
              title: 'Imported Pane',
              cwd: '',
              startupCommand: '',
            },
          ],
        },
      ],
    });

    await page.locator('input[type="file"]').setInputFiles({
      name: 'import.json',
      mimeType: 'application/json',
      buffer: Buffer.from(importData),
    });

    // Close settings to see the workspace
    await page.getByRole('button', { name: /close settings/i }).click();

    await expect(
      page.getByRole('heading', { name: 'Imported Workspace' }),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByRole('button', { name: 'Imported Workspace' }).first(),
    ).toBeVisible();
  });
});
