import { defineConfig, devices } from '@playwright/test';
import { apiUrl, databaseUrl, internalApiUrl, websiteUrl } from './e2e/servers';

const port = (url: string) => new URL(url).port;

// Run through `just test-e2e`, which starts Postgres and empties the tests' database first.
export default defineConfig({
    testDir: 'e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    reporter: 'list',
    use: { baseURL: websiteUrl, trace: 'retain-on-failure' },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: [
        {
            command: 'cargo run -p padb-api',
            cwd: '../..',
            url: `${apiUrl}/health`,
            env: {
                DATABASE_URL: databaseUrl,
                PUBLIC_ADDR: `127.0.0.1:${port(apiUrl)}`,
                INTERNAL_ADDR: `127.0.0.1:${port(internalApiUrl)}`,
            },
            // The first run compiles the API
            timeout: 600_000,
            reuseExistingServer: false,
        },
        {
            command: `pnpm exec vite dev --host 127.0.0.1 --port ${port(websiteUrl)} --strictPort`,
            url: websiteUrl,
            env: { API_URL: apiUrl },
            reuseExistingServer: false,
        },
    ],
});
