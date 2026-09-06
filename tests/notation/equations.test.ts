import { describe, expect, it } from 'vitest';
import { courseConfig } from '../../content/course.config';

import remarkNotation from 'explico/reference/remark-notation.mjs';
import {
  collectDisplayEquations,
  collectEquationLabels,
  parseEquationRef,
  scanEquationLabels,
  stripEquationLabels,
} from 'explico/reference/equations.mjs';
import { validateEquations } from 'explico/reference/equations-validate';
import { compileManifest } from 'explico/compiler/manifest';

// --- pure helpers -----------------------------------------------------

describe('equation identity helpers (D7)', () => {
  it('numbers keyed `$$` blocks per `##` section', () => {
    const md = [
      '$$ a=b \\label{eq:pre} $$', // before any section
      '## First',
      '$$ c=d \\label{eq:one} $$',
      '## Second',
      'text $$ e=f \\label{eq:two} $$ more',
      '$$ g=h \\label{eq:three} $$',
      '```',
      '$$ x=y \\label{eq:infence} $$',
      '```',
    ].join('\n\n');
    expect(
      scanEquationLabels(md, undefined).map((l) => [l.key, l.number]),
    ).toEqual([
      ['pre', '1'], // before any `##`: bare global counter
      ['one', '1.1'],
      ['two', '2.1'],
      ['three', '2.2'],
    ]);
  });

  it('numbers every display equation; a keyed one counts unkeyed neighbours', () => {
    const md = [
      '## S',
      '$$ a=b $$',
      'text $$ c=d \\label{eq:keyed} $$ more',
      '$$ e=f $$',
    ].join('\n\n');
    // The keyed equation is the second display block in the section.
    expect(
      scanEquationLabels(md, undefined).map((l) => [l.key, l.number]),
    ).toEqual([['keyed', '1.2']]);

    const tree = {
      type: 'root',
      children: [
        { type: 'heading', depth: 2, children: [{ type: 'text', value: 'S' }] },
        { type: 'math', value: 'a=b' },
        { type: 'math', value: 'c=d \\label{eq:keyed}' },
        { type: 'math', value: 'e=f' },
      ],
    };
    expect(
      collectDisplayEquations(tree, undefined).map((e) => [e.key, e.number]),
    ).toEqual([
      [null, '1.1'],
      ['keyed', '1.2'],
      [null, '1.3'],
    ]);
    expect(
      collectEquationLabels(tree, undefined).map((e) => [e.key, e.number]),
    ).toEqual([['keyed', '1.2']]);
  });

  it('strips `\\label{eq:…}` and its surrounding whitespace', () => {
    expect(stripEquationLabels('D(0,t)=1.\n\\label{eq:df}\n')).toBe(
      'D(0,t)=1.',
    );
    expect(stripEquationLabels('a=b \\label{eq:x} + c')).toBe('a=b + c');
  });

  it('parses only the reserved `eq-` reference forms', () => {
    expect(parseEquationRef('eq-discount-factor-def')).toEqual({
      key: 'discount-factor-def',
    });
    expect(parseEquationRef('foundations/present-value#eq-pv-sum')).toEqual({
      lesson: 'foundations/present-value',
      key: 'pv-sum',
    });
    expect(parseEquationRef('eq:with-colon')).toBeUndefined();
    expect(parseEquationRef('rates.discount-factor')).toBeUndefined();
  });

  it('tree walk and markdown scan assign the same numbers', () => {
    const tree = {
      type: 'root',
      children: [
        { type: 'heading', depth: 2, children: [{ type: 'text', value: 'A' }] },
        { type: 'math', value: 'a=b \\label{eq:one}' },
        { type: 'heading', depth: 2, children: [{ type: 'text', value: 'B' }] },
        { type: 'math', value: 'c=d \\label{eq:two}' },
        { type: 'math', value: 'e=f' },
      ],
    };
    const md = [
      '## A',
      '$$ a=b \\label{eq:one} $$',
      '## B',
      '$$ c=d \\label{eq:two} $$',
      '$$ e=f $$',
    ].join('\n\n');
    const fromTree = collectEquationLabels(tree, undefined).map((l) => [
      l.key,
      l.number,
    ]);
    const fromMd = scanEquationLabels(md, undefined).map((l) => [
      l.key,
      l.number,
    ]);
    expect(fromTree).toEqual(fromMd);
    expect(fromTree).toEqual([
      ['one', '1.1'],
      ['two', '2.1'],
    ]);
  });
});

// --- validateEquations ---------------------------------------------------

describe('validateEquations (D7)', () => {
  const lesson = (
    overrides: Partial<Parameters<typeof validateEquations>[0][number]> & {
      lessonId: string;
    },
  ) => ({
    slug: overrides.lessonId.replace(/\./g, '/'),
    file: `src/content/docs/${overrides.lessonId.replace(/\./g, '/')}.mdx`,
    body: '',
    ...overrides,
  });

  it('numbers labels and resolves same- and cross-page references', () => {
    const result = validateEquations([
      lesson({
        lessonId: 'foundations.present-value',
        body: '## S\n\n$$ x \\label{eq:pv} $$\n\nsee [[eq-pv]]',
      }),
      lesson({
        lessonId: 'bonds.price-from-discount-factors',
        body: 'from [[foundations/present-value#eq-pv]]',
      }),
    ]);
    expect(result.diagnostics).toEqual([]);
    expect(result.numbersBySlug['foundations/present-value']).toEqual({
      pv: '1.1',
    });
  });

  it('flags a duplicate key, an unknown reference, and an unused label', () => {
    const result = validateEquations([
      lesson({
        lessonId: 'a.b',
        body: '## S\n\n$$ x \\label{eq:dup} $$\n\n$$ y \\label{eq:dup} $$\n\n$$ z \\label{eq:lonely} $$\n\nsee [[eq-missing]]',
      }),
    ]);
    const codes = result.diagnostics.map((d) => d.code).sort();
    expect(codes).toEqual([
      'eq-duplicate-key',
      'eq-key-unused',
      'eq-key-unused',
      'eq-ref-resolves',
    ]);
    expect(
      result.diagnostics
        .filter((d) => d.severity === 'error')
        .map((d) => d.code),
    ).toEqual(['eq-duplicate-key', 'eq-ref-resolves']);
  });
});

// --- remark render path --------------------------------------------------

const lessonFile = () => ({
  path: 'src/content/docs/foundations/discount-factors.mdx',
  data: { astro: { frontmatter: { notation: { local: [] } } } },
  fail(message: string): never {
    throw new Error(message);
  },
});

describe('remarkNotation equation wrapping (D7)', () => {
  it('wraps a keyed `$$` and links `[[eq-key]]` to its number', () => {
    const tree = {
      type: 'root',
      children: [
        { type: 'heading', depth: 2, children: [{ type: 'text', value: 'S' }] },
        {
          type: 'math',
          value: '1+1 \\label{eq:demo}',
          data: {
            hChildren: [
              {
                type: 'element',
                tagName: 'code',
                children: [{ type: 'text', value: '1+1 \\label{eq:demo}' }],
              },
            ],
          },
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'See [[eq-demo]].' }],
        },
      ],
    };
    remarkNotation({ definitions: [], equations: {} })(tree, lessonFile());

    const wrapper = tree.children[1] as unknown as {
      data: { hName: string; hProperties: Record<string, unknown> };
      children: { type: string }[];
    };
    expect(wrapper.data.hName).toBe('div');
    expect(wrapper.data.hProperties.id).toBe('eq-demo');
    expect(wrapper.data.hProperties['data-eq-number']).toBe('1.1');
    expect(wrapper.children[0].type).toBe('math');
    expect(wrapper.children[1]).toMatchObject({
      type: 'link',
      url: '#eq-demo',
    });

    const para = tree.children[2] as unknown as {
      children: Record<string, unknown>[];
    };
    expect(para.children[1]).toMatchObject({
      type: 'link',
      url: '#eq-demo',
      data: { hProperties: { className: ['equation-ref'] } },
    });
  });

  it('fails the build on a reference with no matching label', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'See [[eq-nope]].' }],
        },
      ],
    };
    expect(() =>
      remarkNotation({ definitions: [], equations: {} })(tree, lessonFile()),
    ).toThrow(/eq-nope/);
  });

  it('rejects `\\label{eq:…}` inside inline math', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'inlineMath',
          value: 'a \\label{eq:x}',
          data: { hChildren: [] },
        },
      ],
    };
    expect(() =>
      remarkNotation({ definitions: [], equations: {} })(tree, lessonFile()),
    ).toThrow(/only valid in a \$\$/);
  });
});

// --- manifest wiring --------------------------------------------------

describe('manifest equation identity (D7)', () => {
  it('records labelled equations, the cross-page table, and no blocking diagnostics', async () => {
    const manifest = await compileManifest(courseConfig);
    expect(manifest.schemaVersion).toBe(6);

    const keys = manifest.equations.labels.map((l) => l.key).sort();
    expect(keys).toEqual([
      'alive-bond-recursion',
      'bond-call-expiry-payoff',
      'bond-forward-price',
      'bond-price-from-factors',
      'bond-put-expiry-payoff',
      'cds-fixed-coupon-premium',
      'cds-hazard-to-msq',
      'cds-msq-calibration',
      'cds-upfront-balance',
      'cds-upfront-from-msq',
      'cds-upfront-to-hazard',
      'coupon-period-accrual',
      'dirty-price-bridge',
      'discount-factor-def',
      'exact-cds-premium-leg',
      'exact-cds-protection-leg',
      'expectation-conditional-events',
      'expectation-event-values',
      'forward-discount-factor',
      'knockout-option-recursion',
      'knockout-terminal-payoff',
      'lattice-backward-step',
      'present-value-additivity',
      'present-value-sum',
      'risk-neutral-expected-payoff',
      'risk-neutral-present-value',
      'surviving-bond-continuation',
    ]);
    expect(
      manifest.equations.numbersBySlug['foundations/present-value'],
    ).toEqual({
      'present-value-additivity': '5.2',
      'present-value-sum': '5.1',
    });

    expect(
      manifest.diagnostics.equations.filter((d) => d.severity === 'error'),
    ).toEqual([]);

    const pv = manifest.lessons.find(
      (l) => l.id === 'foundations.present-value',
    );
    expect(pv?.equations).toEqual([
      { key: 'present-value-sum', number: '5.1' },
      { key: 'present-value-additivity', number: '5.2' },
    ]);
  });
});
