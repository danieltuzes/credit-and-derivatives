import { describe, expect, it } from 'vitest';
import {
  renderNotationMath,
  type SafeMathNode,
} from '../../src/components/notation/render-notation-math';

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
});
