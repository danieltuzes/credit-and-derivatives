import { describe, expect, it } from 'vitest';
import {
  buildSidebar,
  citedSourceIds,
  deriveRequires,
  deriveSources,
  isLessonSlug,
  lessonIdFromSlug,
  mergeTrackOrder,
  parseCheckList,
} from '@danieltuzes/legend/compiler/lesson-derivation';
import { loadCurriculumCatalog } from '@danieltuzes/legend/compiler/collections';

describe('lessonIdFromSlug / isLessonSlug', () => {
  it('maps a section slug to a dotted id', () => {
    expect(lessonIdFromSlug('foundations/discount-factors')).toBe(
      'foundations.discount-factors',
    );
    expect(lessonIdFromSlug('cds/market-standard-quote-and-upfront.mdx')).toBe(
      'cds.market-standard-quote-and-upfront',
    );
  });

  it('treats only files inside a section directory as lessons', () => {
    expect(isLessonSlug('foundations/discount-factors')).toBe(true);
    expect(isLessonSlug('index')).toBe(false);
    expect(isLessonSlug('curriculum-map')).toBe(false);
    expect(isLessonSlug('glossary.mdx')).toBe(false);
    expect(isLessonSlug('bonds/index')).toBe(false);
  });
});

describe('deriveRequires', () => {
  const prerequisites = new Map<string, readonly string[]>([
    ['a.interpret', []],
    ['a.calculate', ['a.interpret', 'x.calculate']],
    ['x.calculate', ['y.interpret']],
  ]);

  it('is the direct prerequisites of teaches, minus teaches, sorted', () => {
    expect(
      deriveRequires(['a.interpret', 'a.calculate'], prerequisites),
    ).toEqual(['x.calculate']);
  });

  it('is empty when every prerequisite is taught in the same lesson', () => {
    expect(deriveRequires(['a.interpret'], prerequisites)).toEqual([]);
  });
});

describe('citedSourceIds / deriveSources', () => {
  const body = [
    'Body cites [@tuckman-serrat-fixed-income; §1.2] and',
    '[@hull-options-futures; Ch. 4]. Repeat [@hull-options-futures].',
    '',
    '```tex',
    '[@ignored-in-fence]',
    '```',
    'Inline `[@ignored-inline]` stays inert.',
  ].join('\n');

  it('collects cited ids, ignoring code and duplicates', () => {
    expect([...citedSourceIds(body)].sort()).toEqual([
      'hull-options-futures',
      'tuckman-serrat-fixed-income',
    ]);
  });

  it('deriveSources returns them sorted', () => {
    expect(deriveSources(body)).toEqual([
      'hull-options-futures',
      'tuckman-serrat-fixed-income',
    ]);
  });
});

describe('parseCheckList', () => {
  it('reads a flat id list, ignoring comments and blank lines', () => {
    expect(
      parseCheckList(
        '# a comment\n\n- discount-factor-check\n- bond-yield-check\n',
      ),
    ).toEqual(['discount-factor-check', 'bond-yield-check']);
  });

  it('treats [] and an empty file as no assessments', () => {
    expect(parseCheckList('[]\n')).toEqual([]);
    expect(parseCheckList('')).toEqual([]);
  });

  it('rejects anything that is not a "- id" line', () => {
    expect(() => parseCheckList('assessments:\n  - x\n')).toThrow();
  });
});

describe('mergeTrackOrder', () => {
  it('keeps the first track intact and splices later-track lessons after their predecessor', () => {
    const order = mergeTrackOrder([
      { id: 'b-second', lessons: ['a', 'b', 'x', 'c'] },
      { id: 'a-first', lessons: ['a', 'b', 'c'] },
    ]);
    // 'a-first' sorts first and is placed whole; 'x' from 'b-second' lands after 'b'.
    expect(order).toEqual(['a', 'b', 'x', 'c']);
  });
});

describe('buildSidebar', () => {
  const tracks = [
    { id: 't1', lessons: ['foundations.intro', 'bonds.a', 'bonds.b'] },
  ];
  const slugs = ['bonds/b', 'bonds/a', 'foundations/intro'];
  const sections = [
    { dir: 'foundations', label: 'Foundations' },
    { dir: 'bonds', label: 'Bonds' },
  ];

  it('groups by section, orders lessons by track position, and appends Reference', () => {
    const sidebar = buildSidebar(tracks, slugs, sections);
    const foundations = sidebar.find((group) => group.label === 'Foundations');
    const bonds = sidebar.find((group) => group.label === 'Bonds');
    expect(foundations?.items).toEqual(['foundations/intro']);
    expect(bonds?.items).toEqual(['bonds/a', 'bonds/b']);
    expect(sidebar.at(-1)).toEqual({
      label: 'Reference',
      items: [
        { label: 'Curriculum map', link: '/curriculum-map/' },
        { label: 'Notation glossary', link: '/glossary/' },
      ],
    });
  });
});

describe('derived curriculum catalog (real content)', () => {
  it('derives lessonId, requires, sources and assessments for a known lesson', async () => {
    const catalog = await loadCurriculumCatalog();
    const lesson = catalog.lessons.find(
      (entry) => entry.id === 'foundations.discount-factors',
    );
    expect(lesson).toBeDefined();
    expect(lesson?.requires).toEqual(['rates.periodic-rate.calculate']);
    expect(lesson?.sources).toEqual([
      'hull-options-futures',
      'tuckman-serrat-fixed-income',
    ]);
    expect(lesson?.assessments).toEqual(['discount-factor-check']);
  });

  it('keeps every track prerequisite-valid with derived requires', async () => {
    const { validateCurriculum } =
      await import('@danieltuzes/legend/curriculum/validation');
    const catalog = await loadCurriculumCatalog();
    const blocking = validateCurriculum(catalog).filter(
      (issue) => issue.severity !== 'warning',
    );
    expect(blocking).toEqual([]);
  });
});
