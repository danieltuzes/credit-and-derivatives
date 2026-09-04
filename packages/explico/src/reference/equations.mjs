/**
 * Equation identity (Step D7) — shared, framework-free helpers.
 *
 * An author marks a display equation by putting a trailing `\label{eq:<key>}`
 * inside its `$$…$$` block (inside math, so the `:` is safe and the form
 * matches amsmath). The compiler assigns the *visible* number from appearance
 * order, scoped to the enclosing `##` section (`(2.4)` = fourth keyed equation
 * under the second section). The number is never authored; unkeyed display
 * equations render clean and stay un-referenceable. Prose refers to an
 * equation with the reserved `eq-` prefix (a bare `:` in `[[…]]` prose would
 * be eaten by `remark-directive`):
 *
 *   [[eq-discount-factor-def]]           same page  → "(2.4)" linked to #eq-…
 *   [[foundations/present-value#eq-pv]]  cross page → number from the manifest
 *
 * `scanEquationLabels` (raw Markdown) and `collectEquationLabels` (mdast tree)
 * MUST agree — `tests/notation/equations.test.ts` checks that on the real
 * corpus. Both are here so `manifest.ts` and `remark-notation.mjs` share one
 * numbering algorithm.
 */

/** `eq:` key grammar — the notation-key shape without the dotted namespaces. */
export const EQ_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A `\label{eq:<key>}` anywhere in a math source. Global; `key` in group 1. */
export const EQ_LABEL_PATTERN =
  /\\label\{\s*eq:([a-z0-9]+(?:-[a-z0-9]+)*)\s*\}/g;

/**
 * A `[[ … ]]` payload that targets an equation: `eq-<key>` on the current page,
 * or `<lesson-slug>#eq-<key>` across pages. `lesson` (group 1) is a `/`-slug.
 * The `eq-` prefix is reserved — a notation key may not start with it.
 */
export const EQ_REF_PATTERN =
  /^(?:([a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)#)?eq-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

/** `{ lesson?, key }` when `raw` is an equation reference, else `undefined`. */
export function parseEquationRef(raw) {
  const match = EQ_REF_PATTERN.exec(String(raw).trim());
  if (!match) return undefined;
  return match[1] ? { lesson: match[1], key: match[2] } : { key: match[2] };
}

/** Remove every `\label{eq:…}` (and the whitespace it leaves) from a math source. */
export function stripEquationLabels(latex) {
  return String(latex)
    .replace(EQ_LABEL_PATTERN, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** The visible number for the `index`-th keyed equation under `section`. */
function equationNumber(section, index) {
  return section > 0 ? `${section}.${index}` : String(index);
}

function stripFencedCode(markdown) {
  return String(markdown)
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/~~~[\s\S]*?~~~/g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^`])`[^`\n]*`/g, (match) => match.replace(/[^\n]/g, ' '));
}

/**
 * Every keyed display equation in a Markdown body, in appearance order, with
 * its assigned number. `$$…$$` blocks only; `##` headings between them advance
 * the section counter.
 */
export function scanEquationLabels(markdown) {
  const text = stripFencedCode(markdown);
  const tokens = [];
  const heading = /^[ \t]{0,3}##[ \t]+\S/gm;
  const display = /\$\$([\s\S]+?)\$\$/g;
  for (const match of text.matchAll(heading)) {
    tokens.push({ kind: 'section', index: match.index });
  }
  for (const match of text.matchAll(display)) {
    EQ_LABEL_PATTERN.lastIndex = 0;
    const label = EQ_LABEL_PATTERN.exec(match[1]);
    if (label) {
      tokens.push({ kind: 'equation', index: match.index, key: label[1] });
    }
  }
  tokens.sort((a, b) => a.index - b.index);

  const labels = [];
  let section = 0;
  let indexInSection = 0;
  for (const token of tokens) {
    if (token.kind === 'section') {
      section += 1;
      indexInSection = 0;
      continue;
    }
    indexInSection += 1;
    labels.push({
      key: token.key,
      number: equationNumber(section, indexInSection),
      section,
      indexInSection,
    });
  }
  return labels;
}

/**
 * The mdast equivalent of `scanEquationLabels`: walk the tree in document
 * order, advancing the section counter on every depth-2 heading and emitting a
 * label for every `math` node whose source carries `\label{eq:…}`.
 */
export function collectEquationLabels(tree) {
  const labels = [];
  let section = 0;
  let indexInSection = 0;

  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'heading' && node.depth === 2) {
      section += 1;
      indexInSection = 0;
      return;
    }
    if (node.type === 'math') {
      EQ_LABEL_PATTERN.lastIndex = 0;
      const label = EQ_LABEL_PATTERN.exec(String(node.value ?? ''));
      if (label) {
        indexInSection += 1;
        labels.push({
          key: label[1],
          number: equationNumber(section, indexInSection),
          section,
          indexInSection,
          node,
        });
      }
      return;
    }
    if (Array.isArray(node.children)) node.children.forEach(walk);
  };
  walk(tree);
  return labels;
}
