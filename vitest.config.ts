import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: [
        'src/domain/**/*.ts',
        'src/curriculum/**/*.ts',
        'src/notation/**/*.{ts,mjs}',
      ],
    },
  },
});
