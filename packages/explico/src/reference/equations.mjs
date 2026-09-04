/**
 * Equation identity (Step D7, extended F3) — shared, framework-free helpers.
 *
 * Every display equation (`$$…$$`) in a lesson is numbered and given an
 * `id`, from appearance order scoped to the enclosing `##` section (`(2.4)` =
 * fourth display equation under the second section). An author additionally
 * marks an equation with a trailing `\label{eq:<key>}` inside its `$$…$$`
 * block (inside math, so the `:` is safe and the form matches amsmath) when
 * they want a *stable* anchor that survives edits and cross-page references:
 *
 *   [[eq-discount-factor-def]]           same page  → "(2.4)" linked to #eq-…
 *   [[foundations/present-value#eq-pv]]  cross page → number from the manifest
 *
 * An unkeyed equation still gets a positional anchor (`#eq-2-4`) so it can be
 * deep-linked, but only a keyed equation is referenceable by name.
 *
 * `scanEquationLabels` (raw Markdown) and `collectEquationLabels` (mdast tree)
 * MUST agree — `tests/notation/equations.test.ts` checks that on the real
 * corpus. Both are here so `manifest.ts` and `remark-notation.mjs` share one
 * numbering algorithm. `collectDisplayEquations` is the superset the render
 * path uses to number and anchor every display equation, keyed or not.
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

/** The visible number for the `index`-th display equation under `section`. */
function equationNumber(section, index) {
  return section > 0 ? `${section}.${index}` : String(index);
}

/** The positional anchor id for an unkeyed equation, e.g. `2.4` → `eq-2-4`. */
export function equationAnchorId({ key, number }) {
  return key ? `eq-${key}` : `eq-${String(number).replace(/\./g, '-')}`;
}

function stripFencedCode(markdown) {
  return String(markdown)
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/~~~[\s\S]*?~~~/g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^`])`[^`\n]*`/g, (match) => match.replace(/[^\n]/g, ' '));
}

/**
 * Blank the body of every block-level MDX component (`<Capitalised …> … </…>`)
 * so a `$$…$$` used to illustrate a worked example inside `<CompactExample>`
 * (or an `<Aside>`, etc.) is not counted as a lesson-body equation. The
 * outermost match wins, so nested components are blanked in one pass;
 * newlines are kept so line/section structure is unchanged.
 */
function stripJsxComponents(markdown) {
  return String(markdown).replace(
    /<([A-Z][A-Za-z0-9]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>/g,
    (block) => block.replace(/[^\n]/g, ' '),
  );
}

/**
 * Every keyed display equation in a Markdown body, in appearance order, with
 * its assigned number. `$$…$$` blocks only; `##` headings between them advance
 * the section counter. Every display block advances the in-section index, so a
 * keyed equation's number reflects its position among *all* display equations,
 * not only the keyed ones.
 */
export function scanEquationLabels(markdown) {
  const text = stripJsxComponents(stripFencedCode(markdown));
  const tokens = [];
  const heading = /^[ \t]{0,3}##[ \t]+\S/gm;
  const display = /\$\$([\s\S]+?)\$\$/g;
  for (const match of text.matchAll(heading)) {
    tokens.push({ kind: 'section', index: match.index });
  }
  for (const match of text.matchAll(display)) {
    EQ_LABEL_PATTERN.lastIndex = 0;
    const label = EQ_LABEL_PATTERN.exec(match[1]);
    tokens.push({
      kind: 'equation',
      index: match.index,
      key: label ? label[1] : null,
    });
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
    if (token.key == null) continue;
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
 * The mdast equivalent of `scanEquationLabels` for *every* display equation:
 * walk the tree in document order, advancing the section counter on every
 * depth-2 heading and emitting a record for every `math` node. `key` is the
 * `\label{eq:…}` payload when present, else `null`.
 */
export function collectDisplayEquations(tree) {
  const equations = [];
  let section = 0;
  let indexInSection = 0;

  // Only top-level blocks: a `$$…$$` nested in an MDX component (a
  // `<CompactExample>` worked example, an `<Aside>`) is illustrative, not part
  // of the lesson's equation sequence, and its container may be collapsed.
  const children = Array.isArray(tree?.children) ? tree.children : [];
  for (const node of children) {
    if (!node || typeof node !== 'object') continue;
    if (node.type === 'heading' && node.depth === 2) {
      section += 1;
      indexInSection = 0;
      continue;
    }
    if (node.type === 'math') {
      indexInSection += 1;
      EQ_LABEL_PATTERN.lastIndex = 0;
      const label = EQ_LABEL_PATTERN.exec(String(node.value ?? ''));
      equations.push({
        key: label ? label[1] : null,
        number: equationNumber(section, indexInSection),
        section,
        indexInSection,
        node,
      });
    }
  }
  return equations;
}

/**
 * The keyed subset of `collectDisplayEquations` — the tree-walk counterpart of
 * `scanEquationLabels`. Numbers reflect position among all display equations.
 */
export function collectEquationLabels(tree) {
  return collectDisplayEquations(tree).filter(
    (equation) => equation.key != null,
  );
}
