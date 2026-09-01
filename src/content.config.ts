import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

const editorialStatus = z.enum(['draft', 'in-review', 'reviewed']);
const id = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const notationProse = z
  .string()
  .min(1)
  .refine((value) => !/[\\$`]/.test(value), {
    message:
      'Notation meaning/summary must be plain prose; render the symbol or formula in its dedicated field.',
  });
// Legacy alias while lesson files still say `summary`/`details` (renamed to
// `meaning` by the Phase C2 codemod).
const notationSummary = notationProse;

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

/**
 * Page-local notation entry — reduced shape (Phase C1).
 *
 * Authored: `key`, `latex`, `meaning`, optional `formula`, optional `units`,
 * optional `alignment` (defaults to `general`).
 *
 * The pre-C1 field names (`notation` → `latex`, `summary` → `meaning`) and the
 * fields the codemod removes (`title`, `details`, `sources`, `seeAlso`) stay
 * accepted as optional so existing lesson files validate until the Phase C2
 * codemod rewrites them. The `superRefine` requires one name from each pair.
 */
const localNotationDefinition = z
  .object({
    key: id,
    latex: z.string().min(1).optional(),
    meaning: notationProse.optional(),
    formula: z.string().min(1).optional(),
    units: z.string().min(1).optional(),
    alignment: notationAlignment.default({
      kind: 'general',
      rationale: 'Lesson-local symbol.',
    }),
    // Legacy — removed by the Phase C2 codemod.
    notation: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    summary: notationSummary.optional(),
    details: notationSummary.optional(),
    sources: z.array(id).default([]),
    seeAlso: z.array(id).default([]),
  })
  .superRefine((entry, ctx) => {
    if (!entry.latex && !entry.notation) {
      ctx.addIssue({
        code: 'custom',
        path: ['latex'],
        message: 'notation.local entry needs `latex` (the rendered symbol).',
      });
    }
    if (!entry.meaning && !entry.summary) {
      ctx.addIssue({
        code: 'custom',
        path: ['meaning'],
        message: 'notation.local entry needs `meaning` (one-line prose).',
      });
    }
  });

const lessonNotation = z
  .object({
    // Derived post-C2 (shared keys referenced by prose/math, not defined
    // locally); still authored during the transition.
    uses: z.array(id).default([]),
    local: z.array(localNotationDefinition).default([]),
  })
  .default({ uses: [], local: [] });

/**
 * Lesson frontmatter — reduced shape (Phase C1).
 *
 * Authored:  `title`, `description` (Starlight base), `teaches` (ordered — the
 *            curriculum contract, never derived), `assumptions`, `notation.local`.
 * Artifact:  `editorialStatus` (human-set trust flag).
 * Derived post-C2 / Phase D (kept optional here during the transition, then
 *            moved to the manifest): `lessonId` (path), `requires` (competency
 *            DAG prerequisites of `teaches` minus earlier-in-track `teaches`),
 *            `sources` (`[@…]` occurrences), `notation.uses`, `assessments`
 *            (colocated `checks.yml`), `sidebar.order` (track order).
 * Dropped:   `aiAssisted`, `lastReviewed`, `riskTier`, `estimatedMinutes`
 *            (git history + `editorialStatus` + `NEEDS_SOURCE` carry provenance).
 */
const docs = defineCollection({
  loader: docsLoader(),
  schema: docsSchema({
    extend: z.object({
      editorialStatus: editorialStatus.default('draft'),
      teaches: z.array(id).default([]),
      assumptions: z.array(z.string().min(1)).default([]),
      notation: lessonNotation,
      // Derived post-C2 / Phase D; still authored during the transition.
      lessonId: id.optional(),
      requires: z.array(id).default([]),
      assessments: z.array(id).default([]),
      sources: z.array(id).default([]),
    }),
  }),
});

const competencies = defineCollection({
  loader: glob({
    pattern: '**/*.json',
    base: './src/content/competencies',
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
    base: './src/content/assessments',
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
  loader: glob({ pattern: '**/*.json', base: './src/content/tracks' }),
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
  loader: glob({ pattern: '**/*.json', base: './src/content/sources' }),
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

const notation = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notation' }),
  schema: z.object({
    key: id,
    notation: z.string().min(1),
    title: z.string().min(1),
    summary: notationSummary,
    aliases: z.array(z.string().min(1)).default([]),
    domain: id,
    units: z.string().min(1).optional(),
    perspective: z.string().min(1).optional(),
    sources: z.array(id).default([]),
    seeAlso: z.array(id).default([]),
    alignment: notationAlignment,
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
