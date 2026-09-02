import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { createNotationKatexOptions } from '../../src/reference/katex-options.mjs';
import {
  GlyphResolutionError,
  resolveMathGlyphs,
} from '../../src/reference/math-glyphs.mjs';

const definition = (key: string, notation: string) => ({ key, notation });

describe('page glyph-map resolver', () => {
  it('wraps CF_k and its nested payment index with semantic markers', () => {
    const result = resolveMathGlyphs('CF_k', [
      definition('signed-cash-flow', 'CF_k'),
      definition('payment-index', 'k'),
    ]);

    expect(result.latex).toBe(
      String.raw`\explain{signed-cash-flow}{CF_{\explain{payment-index}{k}}}`,
    );
    expect(result.bindings).toMatchObject([
      {
        key: 'signed-cash-flow',
        token: 'CF_k',
        level: 'scope',
        match: 'canonical',
      },
      {
        key: 'payment-index',
        token: 'k',
        level: 'scope',
        match: 'canonical',
      },
    ]);
    expect(result.unresolved).toEqual([]);

    const rendered = katex.renderToString(
      result.latex,
      createNotationKatexOptions(),
    );
    expect(rendered).toContain('data-notation-key="signed-cash-flow"');
    expect(rendered).toContain('data-notation-key="payment-index"');
    expect(rendered).not.toContain('katex-error');
  });

  it('keeps fraction argument braces outside injected notation markers', () => {
    const result = resolveMathGlyphs(String.raw`r_m=\frac{j^{(m)}}{m}.`, [
      definition('periodic-rate', 'r_m'),
      definition('nominal-annual-rate', String.raw`j^{(m)}`),
      definition('compounding-frequency', 'm'),
    ]);

    expect(result.unresolved).toEqual([]);
    expect(result.latex).toContain(
      String.raw`\frac{\explain{nominal-annual-rate}{j^{(\explain{compounding-frequency}{m})}}}{\explain{compounding-frequency}{m}}`,
    );

    const rendered = katex.renderToString(
      result.latex,
      createNotationKatexOptions(),
    );
    expect(rendered).toContain('data-notation-key="periodic-rate"');
    expect(rendered).toContain('data-notation-key="nominal-annual-rate"');
    expect(rendered).not.toContain('katex-error');
  });

  it('uses a unique canonical base for concrete scripts and shorter forms', () => {
    const definitions = [
      definition('payment-time', 't_k'),
      definition('nominal-annual-rate', String.raw`j^{(m)}`),
      definition('periodic-rate', 'r_m'),
      definition('yield-to-maturity', String.raw`y^{(m_{\mathrm B})}`),
    ];

    expect(resolveMathGlyphs('t_2=2', definitions).unresolved).toEqual([]);
    expect(
      resolveMathGlyphs(String.raw`j^{(2)}=0.06`, definitions).unresolved,
    ).toEqual([]);
    expect(resolveMathGlyphs('r_2=0.03', definitions).unresolved).toEqual([]);
    expect(resolveMathGlyphs('y=0.05', definitions).unresolved).toEqual([]);
  });

  it('ignores prose inside math text commands', () => {
    const result = resolveMathGlyphs(
      String.raw`CF_k\quad\text{occurs at}\quad t_k`,
      [
        definition('signed-cash-flow', 'CF_k'),
        definition('payment-index', 'k'),
        definition('payment-time', 't_k'),
      ],
    );

    expect(result.unresolved).toEqual([]);
    expect(result.latex).toContain(String.raw`\text{occurs at}`);
  });

  it('reports identifiers that have no semantic definition in lesson scope', () => {
    expect(resolveMathGlyphs('z+1', []).unresolved).toEqual([
      { token: 'z', start: 0, end: 1 },
    ]);
  });

  it('fails rather than guessing when a base glyph has two meanings', () => {
    expect(() =>
      resolveMathGlyphs('P', [
        definition('bond-price', 'P_0'),
        definition('price-yield-curve', 'P(y)'),
      ]),
    ).toThrow(GlyphResolutionError);
  });
});
