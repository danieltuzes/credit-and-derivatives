import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // One retry absorbs Vite's transient `504 (Outdated Optimize Dep)` — the dev
  // server re-optimizes its dependency cache on first use (more likely right
  // after `pnpm test` shares `node_modules/.vite`) and a racing request gets a
  // 504 that the console listener flags. The module load itself succeeds on
  // retry; this is not an application error.
  retries: 1,
  use: {
    baseURL: 'http://127.0.0.1:4371',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // e2e runs against the built site (`astro build` + `astro preview`), not the
  // dev server: `pnpm verify` runs `pnpm test` (vitest, Vite) immediately
  // before, and a shared `node_modules/.vite` makes the dev server's lazy
  // dependency re-optimization race incoming requests with sustained
  // `504 (Outdated Optimize Dep)`. `preview` serves static `dist/` — no
  // optimizer, and it is what actually ships.
  webServer: {
    command:
      'pnpm exec astro build && pnpm exec astro preview --host 127.0.0.1 --port 4371',
    url: 'http://127.0.0.1:4371',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
