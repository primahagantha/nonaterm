import baseConfig from './vitest.config';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: [
        'tests/perf/**/*.perf.test.ts',
        'tests/perf/**/*.perf.test.tsx',
      ],
      exclude: ['tests/frontend/**/*.test.ts', 'tests/frontend/**/*.test.tsx'],
      testTimeout: 30000,
      hookTimeout: 30000,
    },
  }),
);
