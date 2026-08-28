import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

export default defineConfig({
  output: 'static',
  integrations: [
    starlight({
      title: 'Credit Products Playground',
      description:
        'Interactive foundations for bonds, credit risk, CDS, CDX, and their options.',
      customCss: ['./src/styles/global.css'],
      sidebar: [
        {
          label: 'Foundations',
          items: [{ autogenerate: { directory: 'foundations' } }],
        },
        {
          label: 'Bonds',
          items: [{ autogenerate: { directory: 'bonds' } }],
        },
      ],
    }),
    react(),
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { output: 'htmlAndMathml' }]],
    }),
  },
});
