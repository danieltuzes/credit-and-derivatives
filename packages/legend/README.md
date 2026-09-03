# @danieltuzes/legend

A build-time engine for **prerequisite-aware, notation-rigorous course
content**. It turns a folder of MDX lessons and JSON collections into a
validated static course whose every rendered symbol is explained and whose
curriculum graph is checked.

What it gives a course:

- **One validated content model** — Zod schemas for lessons, competencies,
  assessments, tracks, sources, and notation; a single loader from files to
  typed data.
- **A semantic notation system** — `[[key]]` binds a glyph to a define-once
  meaning; a **completeness gate** fails the build if any identifier in any
  rendered-math context (lesson body, `notation.formula`, `checks.yml`,
  assessment prompts, component slots) does not resolve to a key. One meaning
  per glyph per page, enforced corpus-wide.
- **Inline citations** — `[@source-id; locator]` → numbered marker + generated
  reference list, resolved against a schema-checked source collection.
- **Equation identity** — `\label{eq:key}` gives a display equation a stable
  key, an appearance-order number, an anchor, and cross-lesson `[[eq-key]]`
  references.
- **A KaTeX trust boundary** — build-time HTML + MathML; the trust callback
  accepts exactly one validated `data-notation-key`. No runtime math, no CDN.
- **A deterministic JSON manifest** — the MCP/LMS contract: lessons, notation,
  competencies, sources, cross-refs, diagnostics, content hashes. Two compiles
  of one content tree are byte-identical.
- **Shared Astro/Starlight UI** — a hover-panel primitive shared by the
  notation and citation layers, a glossary, a curriculum map, compact examples,
  layout overrides.
- **LMS / analytics / identity seams** — framework-free interfaces shipped as
  no-ops; a host supplies real implementations without touching a component.
- **A `content` CLI** — `status`, `context <lesson>`, `check <lesson>` (compiles
  MDX → remark → KaTeX and fails loudly), `new lesson|term`.

The prerequisite graph itself is authored by the lecturer or an AI; the engine
validates it (DAG, ordering, coverage, orphans) rather than inferring it.

## Install

```bash
pnpm add -D @danieltuzes/legend
```

Peer dependencies (the course provides them, pinned): `astro`,
`@astrojs/starlight`, `@astrojs/react`, `@astrojs/markdown-remark`, `react`,
`react-dom`, `katex`, `rehype-katex`, `remark-math`.

## Use

A course provides `content/` (the six collections + `content/domain/` +
`content/course.config.ts`) and wires the engine in three places:

```ts
// src/content.config.ts — Astro's content entry
export { collections } from '@danieltuzes/legend/content-config';
```

```js
// astro.config.mjs
import { loadManifest } from '@danieltuzes/legend/compiler/manifest.js';
import remarkNotation from '@danieltuzes/legend/reference/remark-notation.mjs';
import remarkCitation from '@danieltuzes/legend/reference/remark-citation.mjs';
import { createNotationKatexOptions } from '@danieltuzes/legend/reference/katex-options.mjs';
import rehypeFailKatexErrors from '@danieltuzes/legend/reference/rehype-fail-katex-errors.mjs';
import { courseConfig } from './content/course.config.ts';

const manifest = await loadManifest(courseConfig);
// … starlight({ customCss: ['@danieltuzes/legend/styles/global.css'],
//               components: { Footer: '@danieltuzes/legend/components/starlight/LessonFooter.astro', … } })
// … markdown.remarkPlugins / rehypePlugins from the manifest
```

```jsonc
// package.json — the read-side CLI
"scripts": { "validate:content": "tsx scripts/compile-manifest.ts" }
```

The reference course is
[**credit-and-derivatives**](https://github.com/danieltuzes/credit-and-derivatives):
discounting → bonds → credit/CDS → derivatives and options.

## Layout

| Path                                              | What                                                                                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/compiler/`                                   | the one manifest compiler + the `content` CLI                                                                                               |
| `src/reference/`                                  | notation registry, page-glyph resolver, remark/rehype adapters, the completeness gate, equation identity, consistency checks, KaTeX options |
| `src/curriculum/`                                 | the curriculum-graph semantic validator                                                                                                     |
| `src/components/`                                 | shared Astro/React UI (notation layer, citations, glossary, hover panel, examples, layout)                                                  |
| `src/progress/`, `src/session/`, `src/analytics/` | the LMS / identity / analytics seams (no-op impls)                                                                                          |
| `src/content-config.ts`                           | the Zod collection schemas (Astro re-exports them)                                                                                          |
| `src/styles/`                                     | `global.css` (notation panel, keyed-equation flash, KaTeX)                                                                                  |

## Build

```bash
pnpm build   # tsup → dist/ (ESM + .d.ts) for the .ts core; .astro / .tsx / .css
             # and content-config.ts ship from src/; .mjs adapters are copied.
```

Published `exports` resolve to `dist/` for the typed core and to `src/` for the
Astro components and styles (see `publishConfig` in `package.json`).

## Status

`0.1.x` — extracted from the `equations` project. API not yet stable; the
license is undecided (`UNLICENSED` until chosen).
