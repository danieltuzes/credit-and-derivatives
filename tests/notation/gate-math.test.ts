import { describe, expect, it } from 'vitest';
import { gateContentMath } from 'explico/reference/gate-math';
import type {
  NotationLessonInput,
  SharedNotationDefinitionInput,
} from 'explico/reference/types';

const shared = (
  key: string,
  notation: string,
): SharedNotationDefinitionInput => ({
  key,
  notation,
  label: key,
  summary: `${key} shared summary for the completeness gate`,
  aliases: [],
  domain: 'test',
  sources: [],
  seeAlso: [],
  alignment: { kind: 'general', rationale: 'Test fixture.' },
  status: 'draft',
  aiAssisted: false,
  body: '',
  references: [],
  glosses: [],
  source: { file: `src/content/notation/${key}.md` },
});

const lesson = (
  overrides: Partial<NotationLessonInput> & { lessonId: string },
): NotationLessonInput => ({
  status: 'draft',
  localDefinitions: [],
  references: [],
  body: '',
  source: { file: `src/content/docs/${overrides.lessonId}.mdx` },
  ...overrides,
});

const discountFactor = shared('discount-factor', 'D(0,t)');

describe('completeness gate — every rendered-math context', () => {
  it('passes clean content in every context', () => {
    const diagnostics = gateContentMath({
      notationInput: {
        sharedDefinitions: [discountFactor],
        lessons: [
          lesson({
            lessonId: 'foundations.clean',
            body: 'The [[discount-factor]] is $D(0,2)$.\n\n$$\nD(0,t)\n$$',
            localDefinitions: [
              {
                key: 'clean-local',
                notation: 'L_0',
                label: 'clean-local',
                summary: 'A page-local reading aid used once on this page.',
                formula: 'L_0=D(0,t)',
                sources: [],
                seeAlso: [],
                alignment: { kind: 'general', rationale: 'Local.' },
                references: [],
                glosses: [],
                source: { file: 'src/content/docs/foundations/clean.mdx' },
              },
            ],
          }),
        ],
      },
      assessments: [
        {
          id: 'clean-check',
          items: [
            {
              id: 'q1',
              prompt: 'Give $D(0,2)$.',
              explanation: 'It is $D(0,2)$.',
            },
          ],
        },
      ],
      lessonAssessments: [
        { lessonId: 'foundations.clean', assessmentIds: ['clean-check'] },
      ],
    });

    expect(diagnostics).toEqual([]);
  });

  it('fails an unresolved variable at file:line:token in the lesson body', () => {
    const [diagnostic, ...rest] = gateContentMath({
      notationInput: {
        sharedDefinitions: [discountFactor],
        lessons: [
          lesson({
            lessonId: 'foundations.body',
            body: 'Intro line.\n\nThe [[discount-factor]] appears, then $z$ does not.',
          }),
        ],
      },
      assessments: [],
      lessonAssessments: [],
    });

    expect(rest).toEqual([]);
    expect(diagnostic).toMatchObject({
      context: 'body',
      severity: 'error',
      file: 'src/content/docs/foundations.body.mdx',
      line: 3,
      token: 'z',
    });
  });

  it('fails an unresolved variable in a component-slot equation (body scan covers slots)', () => {
    const diagnostics = gateContentMath({
      notationInput: {
        sharedDefinitions: [discountFactor],
        lessons: [
          lesson({
            lessonId: 'foundations.slot',
            body: [
              'The [[discount-factor]].',
              '',
              '<CompactExample label="x">',
              '',
              '$$',
              'D(0,t) + w',
              '$$',
              '',
              '</CompactExample>',
            ].join('\n'),
          }),
        ],
      },
      assessments: [],
      lessonAssessments: [],
    });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      context: 'body',
      severity: 'error',
      file: 'src/content/docs/foundations.slot.mdx',
      line: 5,
      token: 'w',
    });
  });

  it('blocks an unresolved right-hand-side variable in a notation.local formula', () => {
    const diagnostics = gateContentMath({
      notationInput: {
        sharedDefinitions: [discountFactor],
        lessons: [
          lesson({
            lessonId: 'foundations.formula',
            body: 'The [[discount-factor]].',
            localDefinitions: [
              {
                key: 'formula-local',
                notation: 'G_0',
                label: 'formula-local',
                summary: 'A page-local quantity defined by a small formula.',
                formula: 'G_0 = D(0,t) \\cdot h',
                sources: [],
                seeAlso: [],
                alignment: { kind: 'general', rationale: 'Local.' },
                references: [],
                glosses: [],
                source: {
                  file: 'src/content/docs/foundations/formula.mdx',
                },
              },
            ],
          }),
        ],
      },
      assessments: [],
      lessonAssessments: [],
    });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      context: 'formula',
      // D15: a formula's glyphs are rendered live, so an unresolved one is a
      // hole the reader can see — Tier 1, not a warning.
      severity: 'error',
      file: 'src/content/docs/foundations.formula.mdx',
      token: 'h',
    });
  });

  it('warns on an unresolved variable in assessment prompt/explanation math', () => {
    const diagnostics = gateContentMath({
      notationInput: {
        sharedDefinitions: [discountFactor],
        lessons: [
          lesson({
            lessonId: 'foundations.assessment',
            body: 'The [[discount-factor]].',
          }),
        ],
      },
      assessments: [
        {
          id: 'assessment-check',
          items: [
            {
              id: 'q1',
              prompt: 'Compute $D(0,t)$.',
              explanation: 'Substitute into $D(0,t) + q$ and simplify.',
            },
          ],
        },
      ],
      lessonAssessments: [
        {
          lessonId: 'foundations.assessment',
          assessmentIds: ['assessment-check'],
        },
      ],
    });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      context: 'assessment',
      severity: 'warning',
      file: 'assessment-check (q1)',
      token: 'q',
    });
  });
});
