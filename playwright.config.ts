import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  workers: process.env.CI ? 2 : 1,
  use: {
    browserName: 'chromium',
    headless: true,
    baseURL: 'http://127.0.0.1:1420',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 1420',
    url: 'http://127.0.0.1:1420',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
