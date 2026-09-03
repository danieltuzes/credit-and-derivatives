import katex from 'katex';
import { describe, expect, it } from 'vitest';
import {
  EXPLAIN_MACRO,
  createNotationKatexOptions,
  notationKatexOptions,
  trustNotationMarker,
} from '@danieltuzes/legend/reference/katex-options.mjs';

describe('notation KaTeX options', () => {
  it('renders the explain macro as one inert semantic data marker', () => {
    const html = katex.renderToString(
      String.raw`\explain{rates.discount-factor}{D(0,t)}`,
      notationKatexOptions,
    );

    expect(html).toContain('data-notation-key="rates.discount-factor"');
    expect(html.match(/data-notation-key=/g)).toHaveLength(1);
    expect(html).toContain('D');
    expect(html).not.toContain('<script');
  });

  it('allows only htmlData with one valid notation-key attribute', () => {
    expect(
      trustNotationMarker({
        command: '\\htmlData',
        attributes: { 'data-notation-key': 'bonds.price-yield' },
      }),
    ).toBe(true);

    const rejected = [
      {
        command: '\\href',
        attributes: { 'data-notation-key': 'bonds.price-yield' },
      },
      { command: '\\htmlData' },
      { command: '\\htmlData', attributes: {} },
      {
        command: '\\htmlData',
        attributes: {
          'data-notation-key': 'bonds.price-yield',
          'data-extra': 'not allowed',
        },
      },
      {
        command: '\\htmlData',
        attributes: { 'data-notation-key': 'Bonds.Price' },
      },
      {
        command: '\\htmlData',
        attributes: { 'data-notation-key': 'rate" onclick="alert(1)' },
      },
      {
        command: '\\htmlData',
        attributes: { 'data-notation-key': 17 },
      },
    ];

    for (const context of rejected) {
      expect(trustNotationMarker(context)).toBe(false);
    }
  });

  it('does not trust link commands while rendering with notation options', () => {
    const html = katex.renderToString(
      String.raw`\href{javascript:alert(1)}{unsafe}`,
      notationKatexOptions,
    );

    // KaTeX preserves the source in an inert MathML annotation, so assert on
    // generated elements and attributes rather than raw source substrings.
    expect(html).not.toMatch(/<a(?:\s|>)/);
    expect(html).not.toMatch(/\shref=/);
  });

  it('keeps the trust boundary and explain macro non-overridable', () => {
    expect(() => createNotationKatexOptions({ output: 'html' })).toThrow(
      /output mode cannot be overridden; HTML and MathML are required/,
    );
    expect(() => createNotationKatexOptions({ throwOnError: false })).toThrow(
      /error mode cannot be overridden; rendering errors must fail/,
    );
    expect(() => createNotationKatexOptions({ trust: true })).toThrow(
      /trust callback cannot be overridden/,
    );
    expect(() =>
      createNotationKatexOptions({
        macros: { '\\explain': String.raw`#2` },
      }),
    ).toThrow(/explain KaTeX macro cannot be overridden/);

    const options = createNotationKatexOptions({
      displayMode: true,
      macros: { '\\currency': String.raw`\mathrm{USD}` },
    });
    expect(options).toMatchObject({
      displayMode: true,
      output: 'htmlAndMathml',
      throwOnError: true,
      trust: trustNotationMarker,
      macros: {
        '\\currency': String.raw`\mathrm{USD}`,
        '\\explain': EXPLAIN_MACRO,
      },
    });
  });
});
