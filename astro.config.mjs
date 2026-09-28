import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { explicoContentRefresh } from 'explico/compiler/astro';
import { loadManifest } from 'explico/compiler/manifest';
import { createNotationKatexOptions } from 'explico/reference/katex-options.mjs';
import rehypeFailKatexErrors from 'explico/reference/rehype-fail-katex-errors.mjs';
import rehypeHeadingAnchors from 'explico/reference/rehype-heading-anchors.mjs';
import rehypeTableHeaderLabels from 'explico/reference/rehype-table-header-labels.mjs';
import remarkAbbreviations from 'explico/reference/remark-abbreviations.mjs';
import remarkAsides from 'explico/reference/remark-asides.mjs';
import remarkCitation from 'explico/reference/remark-citation.mjs';
import remarkNotation, {
  createRemarkNotationOptions,
} from 'explico/reference/remark-notation.mjs';
import { courseConfig } from './content/course.config.ts';

// The deployment base path. Empty for local dev, `pnpm verify`, and e2e (the
// site serves from `/`); the GitHub Pages workflow sets `SITE_BASE=/credit-and-derivatives`.
// This is a temporary hosting detail, not an architectural invariant.
const base = process.env.SITE_BASE || undefined;

// Every collapse default (headings, the notation panel, References, checks,
// examples, tables, folds) is the `disclosure` block of `course.config.ts`.
const disclosure = courseConfig.disclosure ?? {};

// The one compiler manifest (Phase D5). `pnpm validate:content` regenerates it
// before every `astro check` / `astro build`; a cold `astro dev` compiles it
// once here (with this course's config), and `explicoContentRefresh` restarts
// Astro after a content edit so every manifest consumer changes as one.
// Nothing in this config re-walks `content/`.
const manifest = await loadManifest(courseConfig);

export default defineConfig({
  output: 'static',
  site: 'https://danieltuzes.github.io',
  base,
  integrations: [
    explicoContentRefresh(courseConfig, manifest),
    starlight({
      title: courseConfig.title,
      description: courseConfig.description,
      customCss: ['explico/styles/global.css', './src/styles/course.css'],
      components: {
        Footer: 'explico/components/starlight/LessonFooter.astro',
        Header: 'explico/components/starlight/LayoutHeader.astro',
        PageSidebar: 'explico/components/starlight/LayoutPageSidebar.astro',
        PageTitle: 'explico/components/starlight/LayoutPageTitle.astro',
        Sidebar: 'explico/components/starlight/LayoutSidebar.astro',
        SocialIcons: 'explico/components/starlight/LayoutSocialIcons.astro',
      },
      // Parts are fixed; lesson order inside each is derived from the tracks
      // (see the manifest `sidebar`), not an authored `sidebar.order`.
      sidebar: manifest.sidebar,
    }),
    react(),
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [
        remarkMath,
        // Every numbering input comes off the one manifest, so the number a
        // page prints and the number a reference to it prints cannot drift;
        // `strict` fails the build on an unplaced equation or float. `base`
        // prefixes the links these plugins write (glossary cards, cross-lesson
        // references, abbreviations), which are otherwise root-relative and
        // 404 under SITE_BASE.
        [
          remarkNotation,
          createRemarkNotationOptions(manifest, { strict: true, base }),
        ],
        [
          remarkCitation,
          {
            sources: manifest.sources,
            defaultOpen: disclosure.references?.defaultOpen === true,
          },
        ],
        [remarkAbbreviations, { abbreviations: manifest.abbreviations, base }],
        // `:::note` / `:::tip` / … become Starlight's `<Aside>`, which
        // Starlight itself does only under its own `src/content/docs/`. Last,
        // so an aside's body is already resolved.
        remarkAsides,
      ],
      rehypePlugins: [
        [rehypeKatex, createNotationKatexOptions()],
        rehypeFailKatexErrors,
        rehypeTableHeaderLabels,
        [rehypeHeadingAnchors, { defaultCollapsible: disclosure }],
      ],
    }),
  },
});
