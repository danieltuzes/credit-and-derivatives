import { describe, expect, it } from 'vitest';

import {
  formulaExplainKeys,
  formulaGlyphScope,
  glossKey,
  glossKeySegment,
  resolveGlosses,
  unknownFormulaScopeKeys,
} from 'explico/reference/gloss';
import type { GlyphScopeEntry } from 'explico/reference/gloss';
import { resolveMathGlyphs } from 'explico/reference/math-glyphs.mjs';

const cards = new Map<string, GlyphScopeEntry>([
  ['expectation', { key: 'expectation', notation: '\\mathbb{E}' }],
  [
    'real-world-probability-measure',
    { key: 'real-world-probability-measure', notation: '\\mathbb{P}' },
  ],
  ['maturity-time', { key: 'maturity-time', notation: 'T' }],
]);

describe('gloss key derivation', () => {
  it('slugs a name into a key segment', () => {
    expect(glossKeySegment('sample space')).toBe('sample-space');
    expect(glossKeySegment('Random Variable')).toBe('random-variable');
    expect(glossKeySegment('  outcome  ')).toBe('outcome');
  });

  it('rejects a name with no usable characters', () => {
    expect(glossKeySegment('   ')).toBeUndefined();
    expect(glossKeySegment('—')).toBeUndefined();
  });

  it('namespaces the key under the owning card', () => {
    expect(glossKey('expectation', 'sample space')).toBe(
      'expectation.sample-space',
    );
  });

  it('lets two cards gloss the same letter without colliding', () => {
    const left = resolveGlosses('expectation', [{ latex: 'T', name: 'time' }]);
    const right = resolveGlosses('bond-price', [{ latex: 'T', name: 'time' }]);
    expect(left[0]?.key).not.toBe(right[0]?.key);
  });

  it('carries an optional units string and drops it when absent', () => {
    const [withUnits, withoutUnits] = resolveGlosses('expectation', [
      { latex: 'T', name: 'horizon', units: 'years from valuation time' },
      { latex: '\\omega', name: 'outcome' },
    ]);
    expect(withUnits?.units).toBe('years from valuation time');
    expect(withoutUnits && 'units' in withoutUnits).toBe(false);
  });
});

describe('formula glyph scope', () => {
  const glosses = resolveGlosses('expectation', [
    { latex: 'X', name: 'random variable' },
    { latex: '\\Omega', name: 'sample space' },
  ]);

  it('is the entry, its glosses, and the cards the formula names', () => {
    const scope = formulaGlyphScope({
      key: 'expectation',
      notation: '\\mathbb{E}',
      formula:
        '\\mathbb{E}[X]=\\int_{\\Omega} X\\,d\\explain{real-world-probability-measure}{\\mathbb{P}}',
      glosses,
      cardsByKey: cards,
    });

    expect(scope.map((entry) => entry.key)).toEqual([
      'expectation',
      'expectation.random-variable',
      'expectation.sample-space',
      'real-world-probability-measure',
    ]);
  });

  it('excludes cards the formula does not name — this is the narrowing', () => {
    const scope = formulaGlyphScope({
      key: 'expectation',
      notation: '\\mathbb{E}',
      formula: '\\mathbb{E}[X]',
      glosses,
      cardsByKey: cards,
    });

    expect(scope.map((entry) => entry.key)).not.toContain('maturity-time');
  });

  it('binds every glyph of the motivating formula', () => {
    const formula =
      '\\mathbb{E}[X]=\\int_{\\Omega} X(\\omega)\\,d\\mathbb{P}(\\omega)';
    const scope = formulaGlyphScope({
      key: 'expectation',
      notation: '\\mathbb{E}',
      formula,
      glosses: resolveGlosses('expectation', [
        { latex: 'X', name: 'random variable' },
        { latex: '\\Omega', name: 'sample space' },
        { latex: '\\omega', name: 'outcome' },
        { latex: '\\mathbb{P}', name: 'probability measure' },
      ]),
      cardsByKey: cards,
    });

    const result = resolveMathGlyphs(formula, scope);
    expect(result.unresolved).toEqual([]);
    expect(result.latex).toContain('\\explain{expectation.sample-space}');
    expect(result.latex).toContain('\\explain{expectation.outcome}');
  });
});

describe('formula scope keys', () => {
  it('reads the keys a formula names', () => {
    expect(
      formulaExplainKeys('\\explain{maturity-time}{T} + \\explain{a.b}{x}'),
    ).toEqual(['maturity-time', 'a.b']);
  });

  it('reports a named key that is neither a card nor a gloss', () => {
    expect(
      unknownFormulaScopeKeys(
        '\\explain{no-such-card}{Z}',
        new Set(['expectation.outcome']),
        new Set(cards.keys()),
      ),
    ).toEqual(['no-such-card']);
  });

  it('accepts a key that is a gloss on the same entry', () => {
    expect(
      unknownFormulaScopeKeys(
        '\\explain{expectation.outcome}{\\omega}',
        new Set(['expectation.outcome']),
        new Set(cards.keys()),
      ),
    ).toEqual([]);
  });
});
