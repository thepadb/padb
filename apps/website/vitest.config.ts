import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts so unit tests run without TanStack Start's plugins.
export default defineConfig({
    // The `@` alias comes from tsconfig.json's paths
    resolve: { tsconfigPaths: true },
    test: { include: ['src/**/*.test.ts'] },
});
