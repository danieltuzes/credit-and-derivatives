import { describe, expect, it } from 'vitest';
import { loadCurriculumCatalog } from '../../scripts/curriculum-files';
import { loadNotationRegistryInput } from '../../scripts/notation-files';
import type {
  CompetencyDefinition,
  CurriculumCatalog,
  LessonDefinition,
} from '../../src/curriculum/validation';
import {
  assertValidNotationAlignment,
  validateNotationAlignment,
} from '../../src/notation/curriculum-alignment';
import { buildNotationRegistry } from '../../src/notation/registry';
import type {
  NotationAlignment,
  NotationLessonInput,
  SharedNotationDefinitionInput,
} from '../../src/notation/types';

type EditorialCompetency = CompetencyDefinition & {
  readonly editorialStatus: 'draft' | 'in-review' | 'reviewed';
};

const competency = (
  id: string,
  editorialStatus: EditorialCompetency['editorialStatus'] = 'draft',
): EditorialCompetency => ({
  id,
  title: id,
  prerequisites: [],
  evidence: {
    minimumIndependentItems: 1,
    requiresTransfer: false,
    requiresUnassistedPass: false,
  },
  editorialStatus,
});

const curriculumLesson = (
  id: string,
  teaches: readonly string[] = [],
  status: LessonDefinition['status'] = 'draft',
): LessonDefinition => ({
  id,
  status,
  requires: [],
  teaches,
  assessments: [],
  sources: [],
  assumptions: [],
});

const catalog = (
  overrides: Partial<CurriculumCatalog> = {},
): CurriculumCatalog => ({
  competencies: [],
  lessons: [],
  assessments: [],
  sources: [],
  tracks: [],
  ...overrides,
});

const alignedDefinition = (
  alignment: NotationAlignment,
  overrides: Partial<SharedNotationDefinitionInput> = {},
): SharedNotationDefinitionInput => ({
  key: 'discount-factor',
  notation: 'D(0,t)',
  title: 'Discount factor',
  aliases: [],
  domain: 'rates',
  sources: [],
  seeAlso: [],
  alignment,
  status: 'draft',
  aiAssisted: false,
  body: '',
  references: [],
  source: { file: 'notation/discount-factor.md' },
  ...overrides,
});

const notationLesson = (
  lessonId: string,
  key = 'discount-factor',
): NotationLessonInput => ({
  lessonId,
  status: 'draft',
  uses: [key],
  localDefinitions: [],
  references: [
    {
      key,
      kind: 'prose',
      source: { file: `lessons/${lessonId}.mdx` },
    },
  ],
  body: '',
  source: { file: `lessons/${lessonId}.mdx` },
});

const ownership = (
  introducedByCompetency = 'rates.discount-factor.interpret',
  introducedInLesson = 'foundations.discount-factors',
): NotationAlignment => ({
  kind: 'competency',
  introducedByCompetency,
  introducedInLesson,
});

describe('notation curriculum alignment', () => {
  it('accepts the repository notation and curriculum catalogs together', async () => {
    const [curriculum, input] = await Promise.all([
      loadCurriculumCatalog(),
      loadNotationRegistryInput(),
    ]);
    const registry = buildNotationRegistry(input);

    expect(
      registry.diagnostics.filter(({ severity }) => severity === 'error'),
    ).toEqual([]);
    expect(validateNotationAlignment(registry, curriculum)).toEqual([]);
  });

  it('accepts an owner competency taught by the introduction lesson', () => {
    const introduction = 'foundations.discount-factors';
    const later = 'foundations.present-value';
    const owner = 'rates.discount-factor.interpret';
    const registry = buildNotationRegistry({
      sharedDefinitions: [alignedDefinition(ownership(owner, introduction))],
      lessons: [notationLesson(introduction), notationLesson(later)],
    });
    const curriculum = catalog({
      competencies: [competency(owner)],
      lessons: [
        curriculumLesson(introduction, [owner]),
        curriculumLesson(later),
      ],
      tracks: [
        {
          id: 'credit-foundations',
          lessons: [introduction, later],
        },
      ],
    });

    expect(validateNotationAlignment(registry, curriculum)).toEqual([]);
    expect(() =>
      assertValidNotationAlignment(registry, curriculum),
    ).not.toThrow();
  });

  it('reports unknown owner competencies and introduction lessons', () => {
    const registry = buildNotationRegistry({
      sharedDefinitions: [
        alignedDefinition(ownership('rates.missing', 'foundations.missing')),
      ],
      lessons: [],
    });
    const diagnostics = validateNotationAlignment(registry, catalog());

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'alignment-unknown-competency',
          key: 'discount-factor',
        }),
        expect.objectContaining({
          code: 'alignment-unknown-lesson',
          key: 'discount-factor',
        }),
      ]),
    );
    expect(() => assertValidNotationAlignment(registry, catalog())).toThrow(
      /alignment-unknown-competency/,
    );
  });

  it('requires the declared introduction lesson to teach the owner', () => {
    const introduction = 'foundations.discount-factors';
    const owner = 'rates.discount-factor.interpret';
    const registry = buildNotationRegistry({
      sharedDefinitions: [alignedDefinition(ownership(owner, introduction))],
      lessons: [notationLesson(introduction)],
    });
    const diagnostics = validateNotationAlignment(
      registry,
      catalog({
        competencies: [competency(owner)],
        lessons: [curriculumLesson(introduction)],
        tracks: [{ id: 'credit-foundations', lessons: [introduction] }],
      }),
    );

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'alignment-introduction',
        message: expect.stringContaining(
          'that lesson does not teach rates.discount-factor.interpret',
        ),
      }),
    );
  });

  it('rejects use earlier than the declared introduction in a track', () => {
    const earlier = 'foundations.rates';
    const introduction = 'foundations.discount-factors';
    const owner = 'rates.discount-factor.interpret';
    const registry = buildNotationRegistry({
      sharedDefinitions: [alignedDefinition(ownership(owner, introduction))],
      lessons: [notationLesson(earlier), notationLesson(introduction)],
    });
    const diagnostics = validateNotationAlignment(
      registry,
      catalog({
        competencies: [competency(owner)],
        lessons: [
          curriculumLesson(earlier),
          curriculumLesson(introduction, [owner]),
        ],
        tracks: [
          {
            id: 'credit-foundations',
            lessons: [earlier, introduction],
          },
        ],
      }),
    );

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'alignment-introduction',
        lessonId: earlier,
        message: expect.stringContaining(
          'used by foundations.rates before its declared introduction',
        ),
      }),
    );
  });

  it('does not allow a reviewed definition to outrun its owner records', () => {
    const introduction = 'foundations.discount-factors';
    const owner = 'rates.discount-factor.interpret';
    const registry = buildNotationRegistry({
      sharedDefinitions: [
        alignedDefinition(ownership(owner, introduction), {
          status: 'reviewed',
        }),
      ],
      lessons: [notationLesson(introduction)],
    });
    const diagnostics = validateNotationAlignment(
      registry,
      catalog({
        competencies: [competency(owner, 'draft')],
        lessons: [curriculumLesson(introduction, [owner], 'draft')],
        tracks: [{ id: 'credit-foundations', lessons: [introduction] }],
      }),
    );

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'alignment-review-state',
        definitionId: 'shared:discount-factor',
      }),
    );
  });
});
