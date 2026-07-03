import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/stress/**/*.stress.test.ts',
      'tests/stress/**/*.stress.test.tsx',
    ],
    exclude: ['tests/frontend/**', 'tests/perf/**', 'tests/e2e/**'],
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
