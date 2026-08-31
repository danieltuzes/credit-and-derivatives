import katex from 'katex';
import { bindMathNotation } from './math-bindings.mjs';
import { createNotationKatexOptions } from './katex-options.mjs';

export interface LabMathScopeDefinition {
  readonly key: string;
  readonly notation: string;
}

export interface RenderedLabMath {
  /** KaTeX HTML+MathML with `data-notation-key` and `data-lab-slot` spans. */
  readonly html: string;
  /** Slot names, in template order, the island must supply at runtime. */
  readonly slots: readonly string[];
  /** Notation keys the template resolved to, for diagnostics. */
  readonly keys: readonly string[];
}

interface BindResult {
  latex: string;
  bindings: ReadonlyArray<{ key: string }>;
  unresolved: ReadonlyArray<{ token: string; start: number }>;
}

// `\slot{name}{fallback}` — `name` is a lab-slot id, `fallback` may contain one
// level of nested braces (for KaTeX digit grouping such as `1{,}000`).
const SLOT_PATTERN = /\\slot\{([a-z][a-z0-9]*)\}\{((?:[^{}]|\{[^{}]*\})*)\}/g;

// A decimal literal is invisible to the notation binder (a number is never an
// identifier), survives `injectScopeBindings` verbatim, and will not collide
// with authored content.
const sentinelFor = (index: number): string => `909909${index}.909909`;

/**
 * Compile a developer-authored lab math template the same way lesson `$$`
 * math is compiled: every identifier must resolve to a notation key in the
 * page's scope or this throws. Slots are set aside during binding and restored
 * as inert `data-lab-slot` spans the interactive island rewrites at runtime.
 */
export function renderLabMath(
  template: string,
  scope: readonly LabMathScopeDefinition[],
): RenderedLabMath {
  const slots: Array<{ name: string; fallback: string }> = [];
  const forBinding = template.replace(
    SLOT_PATTERN,
    (_match: string, name: string, fallback: string) => {
      const sentinel = sentinelFor(slots.length);
      slots.push({ name, fallback });
      return ` ${sentinel} `;
    },
  );

  let result: BindResult;
  try {
    result = bindMathNotation(forBinding, [...scope]) as BindResult;
  } catch (error) {
    throw new Error(
      `Lab math failed to compile: ${
        error instanceof Error ? error.message : String(error)
      }\n  template: ${template.trim()}`,
    );
  }

  if (result.unresolved.length > 0) {
    const list = result.unresolved.map(({ token }) => `"${token}"`).join(', ');
    throw new Error(
      `Lab math uses undefined notation ${list}. Every symbol must resolve to ` +
        `a notation entry in this page's scope (notation.uses or ` +
        `notation.local).\n  template: ${template.trim()}`,
    );
  }

  let bound = result.latex;
  slots.forEach(({ name, fallback }, index) => {
    const sentinel = sentinelFor(index);
    if (!bound.includes(sentinel)) {
      throw new Error(
        `Lab math slot "${name}" was lost during notation binding; keep slots ` +
          `out of subscripts and other reindexed positions.\n  template: ${template.trim()}`,
      );
    }
    bound = bound.replace(
      sentinel,
      `\\htmlData{lab-slot=${name}}{${fallback}}`,
    );
  });

  const html = katex.renderToString(
    bound,
    createNotationKatexOptions({ displayMode: true }),
  );

  return {
    html,
    slots: slots.map(({ name }) => name),
    keys: [...new Set(result.bindings.map(({ key }) => key))],
  };
}
