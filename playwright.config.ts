import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:4371',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command:
      'ASTRO_DEV_BACKGROUND=0 pnpm dev --host 127.0.0.1 --port 4371 --ignore-lock',
    url: 'http://127.0.0.1:4371',
    reuseExistingServer: false,
  },
});
