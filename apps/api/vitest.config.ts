import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 10000,
    // Test files share one real Postgres instance and each resetDatabase() truncates
    // every table in beforeEach. Running files in parallel lets one file's truncation
    // wipe rows another concurrently-running file just inserted. Force sequential
    // file execution so DB-backed tests don't race each other.
    fileParallelism: false,
  },
});
