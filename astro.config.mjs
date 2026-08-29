import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import matter from 'gray-matter';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { createNotationKatexOptions } from './src/notation/katex-options.mjs';
import { markdownFilesBelow } from './src/notation/markdown-files.mjs';
import remarkNotation from './src/notation/remark-notation.mjs';

const notationDirectory = fileURLToPath(
  new URL('./src/content/notation/', import.meta.url),
);
const notationDefinitions = markdownFilesBelow(notationDirectory).map(
  (filename) => {
    const parsed = matter(readFileSync(filename, 'utf8'));
    return parsed.data;
  },
);

export default defineConfig({
  output: 'static',
  integrations: [
    starlight({
      title: 'Credit Products Playground',
      description:
        'Interactive foundations for bonds, credit risk, CDS, CDX, and their options.',
      customCss: ['./src/styles/global.css'],
      components: {
        Footer: './src/components/starlight/NotationFooter.astro',
      },
      sidebar: [
        {
          label: 'Foundations',
          items: [{ autogenerate: { directory: 'foundations' } }],
        },
        {
          label: 'Bonds',
          items: [{ autogenerate: { directory: 'bonds' } }],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Curriculum map', link: '/curriculum-map/' },
            { label: 'Notation glossary', link: '/glossary/' },
          ],
        },
      ],
    }),
    react(),
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [
        remarkMath,
        [remarkNotation, { definitions: notationDefinitions }],
      ],
      rehypePlugins: [[rehypeKatex, createNotationKatexOptions()]],
    }),
  },
});
