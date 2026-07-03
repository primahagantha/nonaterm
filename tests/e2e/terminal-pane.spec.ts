import { test, expect } from '@playwright/test';
import { defaultMockResponses, mockTauriRuntime } from './helpers';

test.describe('Terminal pane lifecycle', () => {
  test('pane renders with correct title', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    const agentPane = page.getByRole('article', { name: 'Agent' });
    await expect(agentPane).toBeVisible();
    await expect(agentPane.locator('.terminal-pane__header')).toContainText(
      'Agent',
    );
  });

  test('restart button is visible and dispatches event', async ({ page }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    const agentPane = page.getByRole('article', { name: 'Agent' });
    const restartBtn = agentPane.getByRole('button', { name: 'Restart pane' });
    await expect(restartBtn).toBeVisible();

    await page.evaluate(() => {
      (
        window as Window & typeof globalThis & Record<string, unknown>
      ).__restartPaneId = null;
      window.addEventListener('Nonaterm:restart-pane', (event: Event) => {
        const detail = (event as CustomEvent<{ paneId: string }>).detail;
        (
          window as Window & typeof globalThis & Record<string, unknown>
        ).__restartPaneId = detail?.paneId ?? null;
      });
    });

    await restartBtn.click();

    const paneId = await page.evaluate(
      () =>
        (window as Window & typeof globalThis & Record<string, unknown>)
          .__restartPaneId,
    );
    expect(paneId).toBeTruthy();
  });

  test('status indicator renders the idle dot for unmounted terminals', async ({
    page,
  }) => {
    await mockTauriRuntime(page, defaultMockResponses());
    await page.goto('/');

    const agentPane = page.getByRole('article', { name: 'Agent' });
    await expect(agentPane).toHaveAttribute('data-status', 'idle');
  });

  test('error message is surfaced when the PTY returns an error', async ({
    page,
  }) => {
    await mockTauriRuntime(
      page,
      defaultMockResponses({
        pty_spawn: () => {
          throw new Error('PTY spawn failed: synthetic fault');
        },
      }),
    );
    await page.goto('/');

    // Wait for the terminal pane itself to mount before checking the
    // error slot — xterm.js is lazy-loaded so it can take a moment.
    await expect(page.locator('.terminal-pane').first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.locator('.terminal-pane__error').first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
