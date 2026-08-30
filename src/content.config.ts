import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

const editorialStatus = z.enum(['draft', 'in-review', 'reviewed']);
const id = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const notationSummary = z
  .string()
  .min(1)
  .refine((value) => !/[\\$`]/.test(value), {
    message:
      'Notation summaries and details must be plain prose; render the symbol or formula in its dedicated field.',
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

const localNotationDefinition = z.object({
  key: id,
  notation: z.string().min(1),
  title: z.string().min(1),
  summary: notationSummary,
  details: notationSummary.optional(),
  formula: z.string().min(1).optional(),
  units: z.string().min(1).optional(),
  sources: z.array(id).default([]),
  seeAlso: z.array(id).default([]),
  alignment: notationAlignment,
});

const lessonNotation = z
  .object({
    uses: z.array(id).default([]),
    local: z.array(localNotationDefinition).default([]),
  })
  .default({ uses: [], local: [] });

const docs = defineCollection({
  loader: docsLoader(),
  schema: docsSchema({
    extend: z.object({
      lessonId: id.optional(),
      editorialStatus: editorialStatus.default('draft'),
      riskTier: z.number().int().min(1).max(3).optional(),
      estimatedMinutes: z.number().int().positive().optional(),
      requires: z.array(id).default([]),
      teaches: z.array(id).default([]),
      assessments: z.array(id).default([]),
      sources: z.array(id).default([]),
      assumptions: z.array(z.string().min(1)).default([]),
      notation: lessonNotation,
      aiAssisted: z.boolean().default(false),
      lastReviewed: z.coerce.date().optional(),
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
