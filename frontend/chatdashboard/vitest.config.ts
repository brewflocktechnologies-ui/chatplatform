import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/unit/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'tests/e2e', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: 'coverage',
      // Unit coverage measures the logic layer. UI components/pages (*.tsx,
      // src/app) and infrastructure that only runs against live systems
      // (websocket hub, module federation, MongoDB, next/font, Sentry
      // instrumentation) are exercised by the Playwright e2e suite instead.
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.{test,spec}.ts',
        'src/**/*.d.ts',
        'src/app/**',
        'src/types/**',
        'src/constants/mock-api.ts',
        'src/features/chat/services/**',
        'src/features/widget-modifier/lib/**',
        'src/lib/mongodb.ts',
        'src/components/themes/font.config.ts',
        'src/instrumentation.ts',
        'src/instrumentation-client.ts'
      ]
    }
  }
});
