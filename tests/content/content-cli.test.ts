import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { compileManifest } from '../../src/content/manifest';
import {
  ContentCliError,
  contentCheck,
  contentContext,
  contentStatus,
  estimateTokens,
  findLesson,
  normalizeLessonId,
  renderLesson,
  scaffoldLesson,
  scaffoldTerm,
} from '../../src/content/cli';

const manifest = await compileManifest();
const DOCS = join(process.cwd(), 'src', 'content', 'docs');
const SAMPLE_LESSON = 'foundations.discount-factors';

describe('content status', () => {
  it('reports live counts, draft debt, and a clean diagnostic split', () => {
    const report = contentStatus(manifest);
    expect(report.counts.lessons).toBe(manifest.lessons.length);
    expect(report.counts.competencies).toBe(manifest.competencies.length);
    expect(report.counts.notationDefinitions).toBe(
      manifest.notation.definitions.length,
    );
    // Every lesson is a draft today; the count must track the manifest, not a
    // hand-written number.
    expect(report.draftDebt.lessons.length).toBe(
      manifest.lessons.filter((lesson) => lesson.status === 'draft').length,
    );
    expect(report.diagnostics.errors).toBe(0);
    expect(report.diagnostics.warnings).toBeGreaterThan(0);
    expect(Array.isArray(report.orphans)).toBe(true);
  });
});

describe('content context', () => {
  const report = contentContext(manifest, 'foundations/discount-factors');

  it('carries the lesson, its outcomes, notation bundle, and cited sources', () => {
    expect(report.lesson.id).toBe(SAMPLE_LESSON);
    expect(report.lesson.body.length).toBeGreaterThan(0);
    expect(report.taughtOutcomes.map((o) => o.id)).toEqual(
      report.lesson.teaches,
    );
    expect(report.prerequisiteOutcomes.map((o) => o.id)).toEqual([
      'rates.periodic-rate.calculate',
    ]);
    expect(report.notation.map((n) => n.key)).toContain('discount-factor');
    expect(report.sources.map((s) => s.id)).toEqual([
      'hull-options-futures',
      'tuckman-serrat-fixed-income',
    ]);
    for (const source of report.sources) {
      expect(source.title.length).toBeGreaterThan(0);
    }
  });

  it('includes the section domain signatures and current diagnostics', () => {
    const signatureText = report.domainSignatures
      .flatMap((entry) => entry.signatures)
      .join('\n');
    expect(report.domainSignatures.length).toBeGreaterThan(0);
    expect(signatureText).toMatch(/\(/); // each signature carries its parameter list
    expect(
      report.diagnostics.every((d) => /^[a-z-]+:[a-z-]+$/.test(d.code)),
    ).toBe(true);
  });

  it('is materially smaller than the doc set + corpus', () => {
    const { context, docSet, corpus, ratio } = report.tokens;
    expect(context).toBeGreaterThan(0);
    expect(context).toBeLessThan(docSet + corpus);
    // A single lesson's context should be a small fraction of everything.
    expect(ratio).toBeLessThan(0.15);
  });

  it('throws a coded error for an unknown lesson', () => {
    try {
      contentContext(manifest, 'foundations/does-not-exist');
      expect.unreachable('expected ContentCliError');
    } catch (error) {
      expect(error).toBeInstanceOf(ContentCliError);
      expect((error as ContentCliError).code).toBe('unknown-lesson');
    }
  });
});

describe('content check — renderability', () => {
  it('passes every real lesson (schema + refs + MDX → KaTeX → HTML)', async () => {
    const report = await contentCheck(manifest, { lesson: SAMPLE_LESSON });
    expect(report.ok).toBe(true);
    expect(report.lessons[0]?.rendered).toBe(true);
    expect(
      report.lessons[0]?.diagnostics.some((d) => d.severity === 'error'),
    ).toBe(false);
  });

  it('fails on a broken-equation fixture at a KaTeX code', async () => {
    const result = await renderLesson(manifest, {
      path: join(DOCS, 'foundations', 'fixture-broken-equation.mdx'),
      frontmatter: { notation: { local: [] } },
      body: [
        'The [[discount-factor]] is $D(0,t)$.',
        '',
        '$$',
        'D(0,t) = \\frac{1}{', // unbalanced brace — KaTeX ParseError
        '$$',
      ].join('\n'),
    });
    expect(result.rendered).toBe(false);
    expect(result.diagnostics[0]?.code).toBe('render:katex');
    expect(result.diagnostics[0]?.severity).toBe('error');
    expect(result.diagnostics[0]?.message).not.toMatch(/\n\s+at\s/); // no stack
  });

  it('fails on an unknown [[key]] at a notation code', async () => {
    const result = await renderLesson(manifest, {
      path: join(DOCS, 'foundations', 'fixture-unknown-key.mdx'),
      frontmatter: { notation: { local: [] } },
      body: 'This references [[totally-made-up-key]] which has no entry.',
    });
    expect(result.rendered).toBe(false);
    expect(result.diagnostics[0]?.code).toBe('render:notation');
    expect(result.diagnostics[0]?.message).toMatch(/totally-made-up-key/);
  });

  it('surfaces an unresolved math identifier as a render:notation failure', async () => {
    const result = await renderLesson(manifest, {
      path: join(DOCS, 'foundations', 'fixture-unbound-symbol.mdx'),
      frontmatter: { notation: { local: [] } },
      body: 'An unbound symbol appears in $q + 1$ with no introduction.',
    });
    expect(result.rendered).toBe(false);
    expect(result.diagnostics[0]?.code).toBe('render:notation');
  });
});

describe('content new — non-overwriting draft scaffolds', () => {
  it('scaffolds a lesson with the reduced frontmatter and a checks.yml', () => {
    const scaffold = scaffoldLesson('foundations/brand-new-lesson');
    expect(scaffold.path).toBe(
      'src/content/docs/foundations/brand-new-lesson.mdx',
    );
    expect(scaffold.contents).toMatch(/editorialStatus: draft/);
    expect(scaffold.contents).toMatch(/teaches: \[\]/);
    expect(scaffold.companions[0]?.path).toBe(
      'src/content/docs/foundations/brand-new-lesson.checks.yml',
    );
  });

  it('scaffolds a term with a substantive placeholder meaning', () => {
    const scaffold = scaffoldTerm('brand-new-term');
    expect(scaffold.path).toBe('src/content/notation/brand-new-term.md');
    expect(scaffold.contents).toMatch(/key: brand-new-term/);
    expect(scaffold.contents).toMatch(/editorialStatus: draft/);
    expect(scaffold.contents).toMatch(/aiAssisted: true/);
  });

  it('refuses to overwrite an existing lesson or term', () => {
    expect(() => scaffoldLesson('foundations/discount-factors')).toThrow(
      ContentCliError,
    );
    try {
      scaffoldTerm('discount-factor');
      expect.unreachable('expected ContentCliError');
    } catch (error) {
      expect((error as ContentCliError).code).toBe('exists');
    }
  });

  it('rejects a malformed lesson id or term key', () => {
    expect(() => scaffoldLesson('no-section')).toThrow(/section/);
    expect(() => scaffoldTerm('Bad Key')).toThrow(ContentCliError);
  });
});

describe('helpers', () => {
  it('normalizes both the slug and dotted lesson id forms', () => {
    expect(normalizeLessonId('foundations/discount-factors')).toBe(
      SAMPLE_LESSON,
    );
    expect(normalizeLessonId('foundations.discount-factors.mdx')).toBe(
      SAMPLE_LESSON,
    );
  });

  it('findLesson resolves a known id and throws a stable code otherwise', () => {
    expect(findLesson(manifest, 'foundations/discount-factors').id).toBe(
      SAMPLE_LESSON,
    );
    expect(() => findLesson(manifest, 'nope.nope')).toThrow(ContentCliError);
  });

  it('estimateTokens grows monotonically with length', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('a'.repeat(400))).toBe(100);
  });
});
