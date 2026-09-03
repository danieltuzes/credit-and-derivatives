import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsSchema } from '@astrojs/starlight/schema';
import { isSubstantiveMeaning } from './reference/prose';

// Phase F: content lives in the top-level `content/` folder, not `src/content/`.
// `docsLoader()` is hard-wired to `<srcDir>/content/docs`, so the `docs`
// collection uses a plain glob with the same extensions and `_`-prefix ignore.
const CONTENT_DIR = './content';
const docsGlob = glob({
  base: `${CONTENT_DIR}/docs`,
  pattern: '**/[^_]*.{md,mdx}',
});

const editorialStatus = z.enum(['draft', 'in-review', 'reviewed']);
const id = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);

/**
 * Notation `meaning` / `summary`: plain prose (no `$`, `\`, backticks), and —
 * the C1b safeguard — substantive, not a placeholder. A short or blocklisted
 * phrase fails the build so a local symbol cannot get a glossary-style panel
 * for a throwaway definition.
 */
const notationProse = z
  .string()
  .min(1)
  .refine((value) => !/[\\$`]/.test(value), {
    message:
      'Notation meaning/summary must be plain prose; render the symbol or formula in its dedicated field.',
  })
  .refine(isSubstantiveMeaning, {
    message:
      'Notation meaning must be substantive prose (at least four words, not a placeholder).',
  });

const notationAlignment = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('competency'),
    introducedByCompetency: id,
    introducedInLesson: id,
  }),
  z.object({
    kind: z.literal('general'),
    rationale: z.string().min(1),
  }),
]);
const notationAlignmentDefault = notationAlignment.default({
  kind: 'general',
  rationale: 'General notation.',
});

/**
 * A citation on a notation definition: a bare id (locator pending, see D6/g) or
 * `{id, locator}` — a per-claim locator verified against the cited text.
 */
const notationSource = z.union([
  id,
  z.object({ id, locator: z.string().min(1) }),
]);

/**
 * One notation entry shape (Phase C1b), shared by page-local `notation.local`
 * and the standalone `notation` collection.
 *
 * Authored: `key`, `latex`, `meaning`, optional `formula`, optional `units`
 * (or `dimensionless: true`), `seeAlso`, `sources` (`{id, locator}`),
 * optional `alignment` (defaults to `general`), optional `label`.
 *
 * The display label defaults to the humanized `key` (see `reference/label.ts`);
 * `label` is authored only where that reads wrong. The `notationProse`
 * refinement rejects an under-specified `meaning`.
 */
const notationEntryShape = z.object({
  key: id,
  latex: z.string().min(1),
  meaning: notationProse,
  formula: z.string().min(1).optional(),
  units: z.string().min(1).optional(),
  dimensionless: z.literal(true).optional(),
  seeAlso: z.array(id).default([]),
  sources: z.array(notationSource).default([]),
  alignment: notationAlignmentDefault,
  label: z.string().min(1).optional(),
});

const localNotationDefinition = notationEntryShape;

const lessonNotation = z
  .object({
    // `notation.uses` is retired (D3): a lesson pulls a shared key into scope
    // by referencing it in prose (`[[key]]`) or math (`\explain`).
    local: z.array(localNotationDefinition).default([]),
  })
  .default({ local: [] });

/**
 * Lesson frontmatter — reduced shape (Phase C1 schema, C2 codemod applied).
 *
 * Authored:  `title`, `description` (Starlight base), `teaches` (ordered — the
 *            curriculum contract, never derived), `assumptions`,
 *            `notation.local` (page-local symbols only).
 * Artifact:  `editorialStatus` (human-set trust flag).
 * Derived (in `content/collections.ts` + `content/lesson-derivation.ts`, never
 *            authored): `lessonId` (doc slug), `requires` (direct competency-DAG
 *            prerequisites of `teaches`, minus `teaches`), `sources` (`[@…]`
 *            occurrences), `assessments` (colocated `<lesson>.checks.yml`),
 *            `sidebar` order (track order).
 * Dropped:   `aiAssisted`, `lastReviewed`, `riskTier`, `estimatedMinutes`
 *            (git history + `editorialStatus` + `NEEDS_SOURCE` carry provenance);
 *            `notation.uses` (D3 — a shared symbol is imported by using it).
 */
const docs = defineCollection({
  loader: docsGlob,
  schema: docsSchema({
    extend: z.object({
      editorialStatus: editorialStatus.default('draft'),
      teaches: z.array(id).default([]),
      assumptions: z.array(z.string().min(1)).default([]),
      notation: lessonNotation,
    }),
  }),
});

const competencies = defineCollection({
  loader: glob({
    pattern: '**/*.json',
    base: './content/competencies',
  }),
  schema: z.object({
    id,
    title: z.string().min(1),
    domain: id,
    facet: z.enum([
      'knowledge',
      'calculation',
      'interpretation',
      'convention',
      'risk',
    ]),
    outcome: z.string().min(1),
    prerequisites: z.array(id).default([]),
    evidence: z.object({
      minimumIndependentItems: z.number().int().min(1),
      requiresTransfer: z.boolean(),
      requiresUnassistedPass: z.boolean(),
    }),
    misconceptions: z.array(z.string().min(1)).default([]),
    editorialStatus,
  }),
});

const assessmentItemBase = z.object({
  id,
  competencyId: id,
  evidenceKind: z.enum(['direct', 'transfer']),
  prompt: z.string().min(1),
  explanation: z.string().min(1),
});

const assessments = defineCollection({
  loader: glob({
    pattern: '**/*.json',
    base: './content/assessments',
  }),
  schema: z.object({
    id,
    title: z.string().min(1),
    editorialStatus,
    items: z
      .array(
        z.discriminatedUnion('type', [
          assessmentItemBase.extend({
            type: z.literal('numeric'),
            answer: z.object({
              value: z.number(),
              tolerance: z.number().positive(),
            }),
          }),
          assessmentItemBase.extend({
            type: z.literal('single-choice'),
            options: z
              .array(
                z.object({
                  id,
                  label: z.string().min(1),
                }),
              )
              .min(2),
            correctOptionId: id,
          }),
        ]),
      )
      .min(1),
  }),
});

const tracks = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './content/tracks' }),
  schema: z.object({
    id,
    title: z.string().min(1),
    description: z.string().min(1),
    audience: z.string().min(1),
    entryAssumptions: z.array(z.string().min(1)),
    lessons: z.array(id).min(1),
    editorialStatus,
  }),
});

const sources = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './content/sources' }),
  schema: z.object({
    id,
    type: z.enum([
      'primary',
      'official-guidance',
      'paper',
      'book',
      'secondary',
    ]),
    title: z.string().min(1),
    authors: z.array(z.string().min(1)).optional(),
    organization: z.string().min(1).optional(),
    edition: z.string().optional(),
    publisher: z.string().optional(),
    year: z.number().int().optional(),
    isbn: z.string().optional(),
    url: z.url().optional(),
    locator: z.string().optional(),
    accessed: z.coerce.date().optional(),
    licenseNotes: z.string().optional(),
    editorialStatus,
  }),
});

/**
 * Standalone notation collection — the one `notationEntry` shape plus the
 * shared-only extras: `domain`, `aliases`, its own `editorialStatus`, and a
 * Markdown body.
 */
const notation = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/notation' }),
  schema: notationEntryShape.extend({
    domain: id,
    aliases: z.array(z.string().min(1)).default([]),
    editorialStatus,
    aiAssisted: z.boolean().default(false),
  }),
});

export const collections = {
  docs,
  competencies,
  assessments,
  tracks,
  sources,
  notation,
};
