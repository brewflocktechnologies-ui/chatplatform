import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    // The mount tests build real iframes; don't let happy-dom try to fetch the
    // CDN scripts, fonts and stylesheets they reference.
    environmentOptions: {
      happyDOM: {
        settings: {
          disableJavaScriptFileLoading: true,
          disableCSSFileLoading: true,
          handleDisabledFileLoadingAsSuccess: true
        }
      }
    },
    include: ['tests/**/*.test.js'],
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**'],
      reportsDirectory: './coverage'
    }
  }
});
