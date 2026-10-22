import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
    // Integration tests against PostgreSQL share one database; files run one after another.
    fileParallelism: false,
  },
});
