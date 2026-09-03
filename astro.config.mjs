import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { loadManifest } from './src/content/manifest.ts';
import { createNotationKatexOptions } from './src/reference/katex-options.mjs';
import rehypeFailKatexErrors from './src/reference/rehype-fail-katex-errors.mjs';
import remarkCitation from './src/reference/remark-citation.mjs';
import remarkNotation from './src/reference/remark-notation.mjs';

// The deployment base path. Empty for local dev, `pnpm verify`, and e2e (the
// site serves from `/`); the GitHub Pages workflow sets `SITE_BASE=/equations`.
// This is a temporary hosting detail, not an architectural invariant.
const base = process.env.SITE_BASE || undefined;

// The one compiler manifest (Phase D5). `pnpm validate:content` regenerates it
// before every `astro check` / `astro build`; a cold `astro dev` compiles it
// once here. Nothing in this config re-walks `src/content/`.
const manifest = await loadManifest();

export default defineConfig({
  output: 'static',
  site: 'https://danieltuzes.github.io',
  base,
  integrations: [
    starlight({
      title: 'Credit Products Playground',
      description:
        'Interactive foundations for bonds, credit risk, CDS, CDX, and their options.',
      customCss: ['./src/styles/global.css'],
      components: {
        Footer: './src/components/starlight/LessonFooter.astro',
        Header: './src/components/starlight/LayoutHeader.astro',
        PageSidebar: './src/components/starlight/LayoutPageSidebar.astro',
        Sidebar: './src/components/starlight/LayoutSidebar.astro',
      },
      // Section groups are fixed; lesson order inside each is derived from the
      // tracks (see the manifest `sidebar`), not an authored `sidebar.order`.
      sidebar: manifest.sidebar,
    }),
    react(),
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [
        remarkMath,
        [
          remarkNotation,
          {
            definitions: manifest.notation.raw,
            equations: manifest.equations.numbersBySlug,
            base,
          },
        ],
        [remarkCitation, { sources: manifest.sources }],
      ],
      rehypePlugins: [
        [rehypeKatex, createNotationKatexOptions()],
        rehypeFailKatexErrors,
      ],
    }),
  },
});
