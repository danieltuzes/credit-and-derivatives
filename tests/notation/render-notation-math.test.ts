import { describe, expect, it } from 'vitest';
import {
  renderNotationFormula,
  renderNotationMath,
  type SafeMathNode,
} from 'explico/components/notation/render-notation-math';
import { resolveGlosses } from 'explico/reference/gloss';

function elements(
  nodes: readonly SafeMathNode[],
): Extract<SafeMathNode, { type: 'element' }>[] {
  return nodes.flatMap((node) =>
    node.type === 'element' ? [node, ...elements(node.children)] : [],
  );
}

describe('static notation math', () => {
  it('keeps CF_k as structured KaTeX with accessible MathML', () => {
    const tree = renderNotationMath(String.raw`CF_k`);
    const renderedElements = elements(tree);

    expect(renderedElements.some(({ tagName }) => tagName === 'math')).toBe(
      true,
    );
    expect(renderedElements.some(({ tagName }) => tagName === 'msub')).toBe(
      true,
    );
    expect(
      renderedElements.some(
        ({ tagName, properties }) =>
          tagName === 'span' && properties.class?.includes('msupsub'),
      ),
    ).toBe(true);
    expect(
      renderedElements.some(
        ({ properties }) => properties['aria-hidden'] === 'true',
      ),
    ).toBe(true);
  });

  it('rejects trust-requiring extension commands', () => {
    expect(() =>
      renderNotationMath(String.raw`\href{javascript:alert(1)}{unsafe}`),
    ).toThrow(/trust-requiring extension/);
  });

  it('allows KaTeX SVG geometry without allowing active SVG content', () => {
    const tree = renderNotationMath(String.raw`\sqrt{x}`);
    const renderedElements = elements(tree);

    expect(renderedElements.some(({ tagName }) => tagName === 'svg')).toBe(
      true,
    );
    expect(renderedElements.some(({ tagName }) => tagName === 'path')).toBe(
      true,
    );
    expect(renderedElements.some(({ tagName }) => tagName === 'script')).toBe(
      false,
    );
  });

  it('rejects trusted marker attributes in a notation label', () => {
    expect(() =>
      renderNotationMath(
        String.raw`\htmlData{notation-key=discount-factor}{D}`,
      ),
    ).toThrow(/trust-requiring extension/);
  });

  it('fails closed for malformed LaTeX', () => {
    expect(() => renderNotationMath(String.raw`CF_{`)).toThrow();
    expect(() => renderNotationMath('   ')).toThrow(/must not be empty/);
  });

  it('emits the notation marker for a resolved formula glyph', () => {
    const tree = renderNotationMath(
      String.raw`\explain{expectation.sample-space}{\Omega}`,
    );

    expect(
      elements(tree).some(
        ({ properties }) =>
          properties['data-notation-key'] === 'expectation.sample-space',
      ),
    ).toBe(true);
  });

  it('rejects a marker whose key is not a notation key', () => {
    expect(() =>
      renderNotationMath(String.raw`\explain{Not A Key}{\Omega}`),
    ).toThrow();
  });
});

/**
 * The `formula` render path (D15): resolve against the entry-scoped table,
 * then render. Unresolved glyphs degrade to inert output rather than costing
 * the reader the equation.
 */
describe('notation formula rendering', () => {
  const scope = [
    { key: 'expectation', notation: String.raw`\mathbb{E}` },
    ...resolveGlosses('expectation', [
      { latex: 'X', name: 'random variable' },
      { latex: '\\Omega', name: 'sample space' },
    ]),
  ];

  it('binds every glyph it can and reports the rest', () => {
    const { nodes, unresolved } = renderNotationFormula(
      String.raw`\mathbb{E}[X]`,
      scope,
    );

    expect(unresolved).toEqual([]);
    const keys = elements(nodes)
      .map(({ properties }) => properties['data-notation-key'])
      .filter(Boolean);
    expect(keys).toContain('expectation');
    expect(keys).toContain('expectation.random-variable');
  });

  it('still renders the equation when a glyph is out of scope', () => {
    const { nodes, unresolved } = renderNotationFormula(
      String.raw`\mathbb{E}[X] + z`,
      scope,
    );

    expect(unresolved).toEqual(['z']);
    expect(elements(nodes).some(({ tagName }) => tagName === 'math')).toBe(
      true,
    );
  });
});
