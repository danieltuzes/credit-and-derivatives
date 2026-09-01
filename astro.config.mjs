import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import matter from 'gray-matter';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { createNotationKatexOptions } from './src/notation/katex-options.mjs';
import { markdownFilesBelow } from './src/notation/markdown-files.mjs';
import rehypeFailKatexErrors from './src/notation/rehype-fail-katex-errors.mjs';
import remarkCitation from './src/notation/remark-citation.mjs';
import remarkNotation from './src/notation/remark-notation.mjs';

const notationDirectory = fileURLToPath(
  new URL('./src/content/notation/', import.meta.url),
);
const loadNotationDefinitions = () =>
  markdownFilesBelow(notationDirectory).map((filename) => {
    const parsed = matter(readFileSync(filename, 'utf8'));
    return parsed.data;
  });

const sourcesDirectory = fileURLToPath(
  new URL('./src/content/sources/', import.meta.url),
);
const loadSourceRecords = () =>
  readdirSync(sourcesDirectory)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) =>
      JSON.parse(readFileSync(join(sourcesDirectory, name), 'utf8')),
    );

export default defineConfig({
  output: 'static',
  // Project GitHub Pages site: https://danieltuzes.github.io/equations
  site: 'https://danieltuzes.github.io',
  base: '/equations',
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
          label: 'Rates and curves',
          items: [{ autogenerate: { directory: 'rates' } }],
        },
        {
          label: 'Derivative foundations',
          items: [{ autogenerate: { directory: 'derivatives' } }],
        },
        {
          label: 'Bond options',
          items: [{ autogenerate: { directory: 'bond-options' } }],
        },
        {
          label: 'Credit risk',
          items: [{ autogenerate: { directory: 'credit' } }],
        },
        {
          label: 'CDS',
          items: [{ autogenerate: { directory: 'cds' } }],
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
        [remarkNotation, { definitions: loadNotationDefinitions }],
        [remarkCitation, { sources: loadSourceRecords }],
      ],
      rehypePlugins: [
        [rehypeKatex, createNotationKatexOptions()],
        rehypeFailKatexErrors,
      ],
    }),
  },
});
