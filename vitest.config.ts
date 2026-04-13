import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.{ts,tsx}', 'packages/*/tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        'packages/*/src/**/*.test.ts',
        '**/index.ts',
        // TODO: re-include once these packages have test coverage
        'packages/observability/src/**',
        'packages/adapters/src/amp-adapter.ts',
        'packages/adapters/src/droid-adapter.ts',
        'packages/harness-mock/src/http-mock.ts',
        'packages/harness-mock/src/websocket-mock.ts',
        'packages/harness-mock/src/multi-execution.ts',
      ],
      reporter: ['text', 'json-summary', 'html'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
  },
});
