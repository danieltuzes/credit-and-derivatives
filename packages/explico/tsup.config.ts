import { defineConfig } from 'tsup';

// The framework-agnostic core (`.ts`) compiles to `dist/` with declarations.
// `.astro` / `.tsx` / `.css` and the Astro-only `content-config.ts` ship as
// source (see `package.json` `publishConfig.exports`); `.mjs` remark/rehype
// adapters are copied verbatim by `scripts/copy-assets.mjs`.
export default defineConfig({
  entry: [
    'src/compiler/**/*.ts',
    'src/curriculum/**/*.ts',
    'src/reference/**/*.ts',
    'src/progress/**/*.ts',
    'src/session/**/*.ts',
    'src/analytics/**/*.ts',
  ],
  outDir: 'dist',
  format: ['esm'],
  target: 'node24',
  platform: 'node',
  bundle: false, // 1:1 transpile — the package has many entry points
  dts: true,
  clean: true,
  sourcemap: false,
  external: [
    'astro',
    'astro:content',
    /^astro\//,
    /^@astrojs\//,
    'react',
    'react-dom',
    'katex',
    'rehype-katex',
    'remark-math',
  ],
});
