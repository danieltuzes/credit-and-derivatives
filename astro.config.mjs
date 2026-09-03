import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { loadManifest } from '@danieltuzes/legend/compiler/manifest.ts';
import { createNotationKatexOptions } from '@danieltuzes/legend/reference/katex-options.mjs';
import rehypeFailKatexErrors from '@danieltuzes/legend/reference/rehype-fail-katex-errors.mjs';
import remarkCitation from '@danieltuzes/legend/reference/remark-citation.mjs';
import remarkNotation from '@danieltuzes/legend/reference/remark-notation.mjs';
import { courseConfig } from './content/course.config.ts';

// The deployment base path. Empty for local dev, `pnpm verify`, and e2e (the
// site serves from `/`); the GitHub Pages workflow sets `SITE_BASE=/equations`.
// This is a temporary hosting detail, not an architectural invariant.
const base = process.env.SITE_BASE || undefined;

// The one compiler manifest (Phase D5). `pnpm validate:content` regenerates it
// before every `astro check` / `astro build`; a cold `astro dev` compiles it
// once here (with this course's config). Nothing in this config re-walks
// `content/`.
const manifest = await loadManifest(courseConfig);

export default defineConfig({
  output: 'static',
  site: 'https://danieltuzes.github.io',
  base,
  integrations: [
    starlight({
      title: courseConfig.title,
      description: courseConfig.description,
      customCss: ['@danieltuzes/legend/styles/global.css'],
      components: {
        Footer: '@danieltuzes/legend/components/starlight/LessonFooter.astro',
        Header: '@danieltuzes/legend/components/starlight/LayoutHeader.astro',
        PageSidebar:
          '@danieltuzes/legend/components/starlight/LayoutPageSidebar.astro',
        Sidebar: '@danieltuzes/legend/components/starlight/LayoutSidebar.astro',
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
