import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `compileManifest` over the whole corpus takes about 6 s since explico 0.13.
    testTimeout: 30_000,
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: ['content/domain/**/*.ts'],
    },
  },
});
