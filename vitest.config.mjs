import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    alias: {
      '@': path.resolve(__dirname, 'src/'),
      '@tests': path.resolve(__dirname, 'tests/'),
    },
    bail: 0,
    coverage: {
      all: true,
      clean: true,
      exclude: ['**/tests/**', '**/*.d.ts', '**/_*/**'],
      include: ['src/**'],
      provider: 'v8',
      reporter: ['text', 'html', 'cobertura', 'json', 'json-summary'],
      reportOnFailure: true,
      reportsDirectory: 'coverage',
      thresholds: {
        branches: 95,
        functions: 95,
        lines: 95,
        statements: 95,
      },
    },
    environment: 'node',
    expect: { requireAssertions: true },
    globals: true,
    include: ['tests/**/*.{test,spec}.{ts,js}'],
    outputFile: {
      json: 'report.json',
      junit: 'junit.xml',
    },
    passWithNoTests: false,
    reporters: ['default', 'junit', 'json'],
    testTimeout: 10_000,
    verbose: true,
    watch: false,
  },
});
