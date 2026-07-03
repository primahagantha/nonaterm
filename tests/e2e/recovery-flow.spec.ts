import { test, expect } from '@playwright/test';
import {
  defaultMockResponses,
  dirtyRecoveryStatus,
  mockRecoveryStatus,
  mockTauriRuntime,
} from './helpers';
import type { Workspace } from '@/types/workspace';

test.describe('Crash recovery flow', () => {
  test('recovery toast appears on dirty shutdown', async ({ page }) => {
    const dirtySnapshot: Workspace[] = [
      {
        id: 'workspace-saved',
        name: 'Saved Session',
        accentColor: '#22c55e',
        layoutPreset: '1',
        panes: [
          {
            id: 'pane-s1',
            title: 'Saved Pane',
            cwd: '',
            startupCommand: '',
          },
        ],
      },
    ];

    await mockTauriRuntime(
      page,
      defaultMockResponses(
        mockRecoveryStatus(dirtyRecoveryStatus(dirtySnapshot)),
      ),
    );
    await page.goto('/');

    await expect(
      page.getByRole('status', { name: 'Session recovery' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Restore', exact: true }),
    ).toBeVisible();
  });

  test('clicking Restore hydrates the saved workspace', async ({ page }) => {
    const dirtySnapshot: Workspace[] = [
      {
        id: 'workspace-saved',
        name: 'Saved Session',
        accentColor: '#22c55e',
        layoutPreset: '1',
        panes: [
          {
            id: 'pane-s1',
            title: 'Saved Pane',
            cwd: '',
            startupCommand: '',
          },
        ],
      },
    ];

    await mockTauriRuntime(
      page,
      defaultMockResponses(
        mockRecoveryStatus(dirtyRecoveryStatus(dirtySnapshot)),
      ),
    );
    await page.goto('/');

    await expect(
      page.getByRole('status', { name: 'Session recovery' }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Restore', exact: true })
      .click({ force: true });

    await expect(
      page.getByRole('heading', { name: 'Saved Session' }),
    ).toBeVisible();

    await expect(
      page.getByRole('status', { name: 'Session recovery' }),
    ).not.toBeVisible();
  });

  test('clicking dismiss removes the recovery toast', async ({ page }) => {
    const dirtySnapshot: Workspace[] = [
      {
        id: 'workspace-saved',
        name: 'Saved Session',
        accentColor: '#22c55e',
        layoutPreset: '1',
        panes: [
          {
            id: 'pane-s1',
            title: 'Saved Pane',
            cwd: '',
            startupCommand: '',
          },
        ],
      },
    ];

    await mockTauriRuntime(
      page,
      defaultMockResponses(
        mockRecoveryStatus(dirtyRecoveryStatus(dirtySnapshot)),
      ),
    );
    await page.goto('/');

    await expect(
      page.getByRole('status', { name: 'Session recovery' }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: /Dismiss/ })
      .click({ force: true });

    await expect(
      page.getByRole('status', { name: 'Session recovery' }),
    ).not.toBeVisible();
  });

  test('no toast on clean shutdown', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    await expect(
      page.getByRole('status', { name: 'Session recovery' }),
    ).not.toBeVisible();
  });
});
