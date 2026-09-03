import { describe, expect, it } from 'vitest';
import { loadCurriculumCatalog } from '@danieltuzes/legend/compiler/collections';
import {
  assertValidCurriculum,
  curriculumErrors,
  validateCurriculum,
  type AssessmentDefinition,
  type CompetencyDefinition,
  type CurriculumCatalog,
  type LessonDefinition,
} from '@danieltuzes/legend/curriculum/validation';

const competency = (
  id: string,
  prerequisites: readonly string[] = [],
): CompetencyDefinition => ({
  id,
  title: id,
  prerequisites,
  evidence: {
    minimumIndependentItems: 1,
    requiresTransfer: false,
    requiresUnassistedPass: false,
  },
});

const catalogWith = (
  competencies: readonly CompetencyDefinition[],
): CurriculumCatalog => ({
  competencies,
  lessons: [],
  assessments: [],
  sources: [],
  tracks: [],
});

describe('curriculum validation', () => {
  it('accepts the repository curriculum (no blocking errors)', async () => {
    const issues = validateCurriculum(await loadCurriculumCatalog());
    expect(curriculumErrors(issues)).toEqual([]);
  });

  it('accepts a valid competency DAG with multiple roots', () => {
    expect(
      validateCurriculum(
        catalogWith([
          competency('math.percentages'),
          competency('math.exponents'),
          competency('rates.discounting', [
            'math.percentages',
            'math.exponents',
          ]),
          competency('bonds.present-value', ['rates.discounting']),
        ]),
      ),
    ).toEqual([]);
  });

  it('reports duplicate IDs and unknown prerequisites', () => {
    const issues = validateCurriculum(
      catalogWith([
        competency('credit.hazard', ['math.conditional-probability']),
        competency('credit.hazard'),
      ]),
    );
    expect(issues.map(({ message }) => message)).toEqual(
      expect.arrayContaining([
        'duplicate competency id credit.hazard',
        'credit.hazard requires unknown competency math.conditional-probability',
      ]),
    );
  });

  it('reports a multi-node cycle with its path', () => {
    const issues = validateCurriculum(
      catalogWith([
        competency('node-a', ['node-b']),
        competency('node-b', ['node-c']),
        competency('node-c', ['node-a']),
      ]),
    );
    expect(issues.map(({ message }) => message)).toContain(
      'prerequisite cycle: node-a -> node-b -> node-c -> node-a',
    );
  });
});

const lesson = (
  overrides: Partial<LessonDefinition> & Pick<LessonDefinition, 'id'>,
): LessonDefinition => ({
  status: 'draft',
  requires: [],
  teaches: [],
  assessments: [],
  sources: [],
  assumptions: ['stated'],
  body: '',
  ...overrides,
});

const measuring = (competencyId: string): AssessmentDefinition => ({
  id: `${competencyId}-check`,
  items: [
    {
      id: `${competencyId}-item`,
      competencyId,
      evidenceKind: 'direct',
      type: 'numeric',
      answer: { value: 1, tolerance: 0.1 },
    },
  ],
});

describe('teaches-support lint (warning tier)', () => {
  const owner = competency('rates.discounting');

  it('warns when a taught competency has no worked instance in the body', () => {
    const issues = validateCurriculum({
      competencies: [owner],
      lessons: [
        lesson({
          id: 'l.one',
          teaches: ['rates.discounting'],
          body: 'Prose only.',
        }),
      ],
      assessments: [measuring('rates.discounting')],
      sources: [],
      tracks: [],
    });
    const support = issues.filter((issue) => issue.kind === 'teaches-support');
    expect(support).toHaveLength(1);
    expect(support[0]?.severity).toBe('warning');
    expect(support[0]?.message).toContain('no worked instance');
  });

  it('warns when a taught competency has no assessment item', () => {
    const issues = validateCurriculum({
      competencies: [owner],
      lessons: [
        lesson({
          id: 'l.two',
          teaches: ['rates.discounting'],
          body: 'Then $D = 0.95$.',
        }),
      ],
      assessments: [],
      sources: [],
      tracks: [],
    });
    const support = issues.filter((issue) => issue.kind === 'teaches-support');
    expect(support.map(({ message }) => message)).toEqual([
      'l.two teaches rates.discounting with no assessment item measuring it',
    ]);
  });

  it('is silent, and never blocks, when both signals are present', () => {
    const catalog: CurriculumCatalog = {
      competencies: [owner],
      lessons: [
        lesson({
          id: 'l.three',
          teaches: ['rates.discounting'],
          body: '<CompactExample /> giving $D = 0.95$.',
        }),
      ],
      assessments: [measuring('rates.discounting')],
      sources: [],
      tracks: [],
    };
    expect(
      validateCurriculum(catalog).filter((i) => i.kind === 'teaches-support'),
    ).toEqual([]);
    expect(() => assertValidCurriculum(catalog)).not.toThrow();
  });
});
