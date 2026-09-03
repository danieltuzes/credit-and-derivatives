import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: [
        'src/domain/**/*.ts',
        'src/curriculum/**/*.ts',
        'src/reference/**/*.{ts,mjs}',
        'src/progress/**/*.ts',
        'src/analytics/**/*.ts',
        'src/session/**/*.ts',
        'src/content/**/*.ts',
      ],
    },
  },
});
