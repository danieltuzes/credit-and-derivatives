import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { isSubstantiveMeaning } from './notation/prose';

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
// Legacy alias while files still say `summary`/`details` (renamed to `meaning`
// by the Phase C2 codemod).
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
const notationAlignmentDefault = notationAlignment.default({
  kind: 'general',
  rationale: 'General notation.',
});

/** A citation on a notation definition: a bare id (legacy) or `{id, locator}`. */
const notationSource = z.union([
  id,
  z.object({ id, locator: z.string().min(1) }),
]);

/**
 * `notation` → `latex`, `summary` → `meaning` (Phase C1b). Both new names are
 * optional in the schema and the pre-C1b names stay accepted so files validate
 * until the codemod renames them; this refinement requires one from each pair.
 */
function requireLatexAndMeaning(
  entry: {
    latex?: string;
    notation?: string;
    meaning?: string;
    summary?: string;
  },
  ctx: z.RefinementCtx,
): void {
  if (!entry.latex && !entry.notation) {
    ctx.addIssue({
      code: 'custom',
      path: ['latex'],
      message: 'notation entry needs `latex` (the rendered symbol).',
    });
  }
  if (!entry.meaning && !entry.summary) {
    ctx.addIssue({
      code: 'custom',
      path: ['meaning'],
      message: 'notation entry needs `meaning` (one-line prose).',
    });
  }
}

/**
 * One notation entry shape (Phase C1b), shared by page-local `notation.local`
 * and the standalone `notation` collection.
 *
 * Authored: `key`, `latex`, `meaning`, optional `formula`, optional `units`
 * (or `dimensionless: true`), optional `seeAlso`, optional `sources`
 * (`{id, locator}`), optional `alignment` (defaults to `general`).
 *
 * Pre-C1b names (`notation` → `latex`, `summary` → `meaning`) and fields the
 * codemod removes (`title`, `details`) stay accepted as optional so existing
 * files validate until the codemod rewrites them; `requireLatexAndMeaning`
 * requires one name from each pair. The `notationProse` refinement rejects an
 * under-specified `meaning`.
 */
const notationEntryShape = z.object({
  key: id,
  latex: z.string().min(1).optional(),
  meaning: notationProse.optional(),
  formula: z.string().min(1).optional(),
  units: z.string().min(1).optional(),
  dimensionless: z.literal(true).optional(),
  seeAlso: z.array(id).default([]),
  sources: z.array(notationSource).default([]),
  alignment: notationAlignmentDefault,
  // Legacy — removed by the Phase C2 codemod.
  notation: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  summary: notationSummary.optional(),
  details: notationSummary.optional(),
});

const localNotationDefinition = notationEntryShape.superRefine(
  requireLatexAndMeaning,
);

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

/**
 * Standalone notation collection — the one `notationEntry` shape plus the
 * shared-only extras: `domain`, `aliases`, its own `editorialStatus`, and a
 * Markdown body.
 *
 * The pre-C1b legacy trio (`notation`, `title`, `summary`) is still *required*
 * here so components that read `entry.data.*` keep their non-optional types
 * until the codemod renames the fields and updates those components together.
 * `perspective` stays accepted (deprecated) until the codemod folds each real
 * disambiguation / sign convention into `meaning` and drops the rest.
 */
const notation = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notation' }),
  schema: notationEntryShape
    .extend({
      notation: z.string().min(1),
      title: z.string().min(1),
      summary: notationSummary,
      domain: id,
      aliases: z.array(z.string().min(1)).default([]),
      editorialStatus,
      aiAssisted: z.boolean().default(false),
      perspective: z.string().min(1).optional(),
    })
    .superRefine(requireLatexAndMeaning),
});

export const collections = {
  docs,
  competencies,
  assessments,
  tracks,
  sources,
  notation,
};
