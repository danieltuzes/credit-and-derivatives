import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import {
  loadNotationDefinitions,
  loadSidebar,
  loadSourceRecords,
} from './src/content/collections.ts';
import { createNotationKatexOptions } from './src/notation/katex-options.mjs';
import rehypeFailKatexErrors from './src/notation/rehype-fail-katex-errors.mjs';
import remarkCitation from './src/notation/remark-citation.mjs';
import remarkNotation from './src/notation/remark-notation.mjs';

// The deployment base path. Empty for local dev, `pnpm verify`, and e2e (the
// site serves from `/`); the GitHub Pages workflow sets `SITE_BASE=/equations`.
// This is a temporary hosting detail, not an architectural invariant.
const base = process.env.SITE_BASE || undefined;

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
      // tracks (see `loadSidebar` / `buildSidebar`), not an authored
      // `sidebar.order`.
      sidebar: loadSidebar(),
    }),
    react(),
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [
        remarkMath,
        [remarkNotation, { definitions: loadNotationDefinitions, base }],
        [remarkCitation, { sources: loadSourceRecords }],
      ],
      rehypePlugins: [
        [rehypeKatex, createNotationKatexOptions()],
        rehypeFailKatexErrors,
      ],
    }),
  },
});
