import katex from 'katex';

import { BASE_LIBRARY } from './base-library.mjs';

/**
 * Page-level glyph-map resolver (cleanup plan, D1 decision 2026-09-02).
 *
 * A page declares its glyphs once — `notation.local` plus the shared entries it
 * introduces in prose with `[[key]]` — so the glyph table handed in here is a
 * flat list with **one meaning per glyph**. This module parses one `$…$` /
 * `$$…$$` expression, matches each declared symbol against it (whole canonical
 * form first, then a unique base glyph for a shorter or instantiated form),
 * marks every match with a validated `\explain` marker, and reports any
 * remaining identifier atom so the caller can fail at `file:line:token`.
 * `\explain{key}{latex}` in the source stays as the escape hatch for a
 * compound or glyph-colliding symbol.
 *
 * Because the table is unambiguous, matching is a lookup, not a search: no
 * cross-definition candidate solving, no ambiguity permutation. What remains is
 * the tokenizer the page-glyph-map syntax requires — a KaTeX parse plus the
 * structural signatures that let `CF_k` be found as a three-node run and `D` be
 * found as the head of `D(0,2)`. `katex.__parse` is that tokenizer; the version
 * guard below keeps a dependency bump from silently changing its tree.
 */
export const SUPPORTED_KATEX_PARSE_VERSION = '0.16.47';

const KEY_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const EXPLAIN_COMMAND = String.raw`\explain`;

// `\mathrm{…}` always wraps an upright roman label (`\mathrm{opt}`,
// `\mathrm{PV}`), never a bindable identifier atom, so its body is skipped whole.
const ROMAN_LABEL_FONT = 'mathrm';

// The only blackboard-bold / script tokens treated like the base library: the
// universal number systems. This is an explicit token list, not a font class —
// `\mathbb{E}`, `\mathbb{P}`, and `\mathbb{Q}` are ordinary identifiers that
// must resolve to a semantic key. (`\mathbb{Q}` is the risk-neutral measure in
// this corpus, not the rationals; a lesson that needs the rationals reaches for
// `\explain`.)
const IGNORED_MATH_TOKENS = new Set([
  '\\mathbb{N}',
  '\\mathbb{Z}',
  '\\mathbb{R}',
  '\\mathbb{C}',
]);

// KaTeX font ids mapped back to their LaTeX command, so a single-letter font
// node can be reconstructed as its source token (`\mathbb{N}`).
const FONT_COMMANDS = new Map([
  ['mathbb', '\\mathbb'],
  ['mathcal', '\\mathcal'],
  ['mathfrak', '\\mathfrak'],
  ['mathscr', '\\mathscr'],
  ['mathrm', '\\mathrm'],
  ['mathbf', '\\mathbf'],
  ['mathit', '\\mathit'],
]);

function fontBodyText(value) {
  if (Array.isArray(value)) {
    const parts = value.map(fontBodyText);
    return parts.every((part) => part !== undefined)
      ? parts.join('')
      : undefined;
  }
  if (!isNode(value)) return undefined;
  if (value.type === 'ordgroup') return fontBodyText(value.body);
  if (value.type === 'mathord' || value.type === 'textord') return value.text;
  return undefined;
}

/** Reconstruct the source token of a font node, e.g. `\mathbb{N}`. */
function fontTokenText(node) {
  if (!isNode(node) || node.type !== 'font') return undefined;
  const command = FONT_COMMANDS.get(node.font);
  if (command === undefined) return undefined;
  const letters = fontBodyText(node.body);
  return letters === undefined ? undefined : `${command}{${letters}}`;
}
const SOURCE_CHILD_KEYS = new Set([
  'above',
  'base',
  'below',
  'body',
  'denom',
  'display',
  'html',
  'index',
  'mathml',
  'nameGroup',
  'numer',
  'sub',
  'sup',
  'tag',
  'text',
]);

export class GlyphResolutionError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = 'GlyphResolutionError';
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new GlyphResolutionError(code, message, details);
}

function assertPinnedKatex() {
  if (katex.version !== SUPPORTED_KATEX_PARSE_VERSION) {
    fail(
      'unsupported-katex-version',
      `Glyph resolution expects KaTeX ${SUPPORTED_KATEX_PARSE_VERSION}, but ${katex.version} is installed. Review the internal parse-tree adapter before changing the pin.`,
      { expected: SUPPORTED_KATEX_PARSE_VERSION, actual: katex.version },
    );
  }
}

function parseMath(latex, label) {
  assertPinnedKatex();
  try {
    return katex.__parse(latex, { throwOnError: true, strict: 'error' });
  } catch (error) {
    fail(
      'invalid-latex',
      `KaTeX could not parse ${label}: ${error instanceof Error ? error.message : String(error)}`,
      { label, latex },
    );
  }
}

// --- low-level source scanning -------------------------------------------

function isNode(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof value.type === 'string',
  );
}

function isEscaped(value, index) {
  let slashes = 0;
  for (
    let cursor = index - 1;
    cursor >= 0 && value[cursor] === '\\';
    cursor--
  ) {
    slashes += 1;
  }
  return slashes % 2 === 1;
}

function skipWhitespace(value, index) {
  let cursor = index;
  while (/\s/.test(value[cursor] ?? '')) cursor += 1;
  return cursor;
}

function readBracedGroup(value, start) {
  if (value[start] !== '{') return undefined;
  let depth = 0;
  for (let cursor = start; cursor < value.length; cursor++) {
    if (isEscaped(value, cursor)) continue;
    if (value[cursor] === '{') depth += 1;
    if (value[cursor] === '}') {
      depth -= 1;
      if (depth === 0) {
        return {
          content: value.slice(start + 1, cursor),
          contentStart: start + 1,
          contentEnd: cursor,
          end: cursor + 1,
        };
      }
    }
  }
  return undefined;
}

/**
 * Every `\explain{key}{latex}` in the source (the escape hatch). Each key must
 * already be in the page glyph table. The returned span points at the wrapped
 * LaTeX so it can be re-marked without disturbing the author's own braces.
 */
function findExplainCalls(latex, definitionsByKey) {
  const calls = [];
  let cursor = 0;

  while (cursor < latex.length) {
    const start = latex.indexOf(EXPLAIN_COMMAND, cursor);
    if (start === -1) break;
    cursor = start + EXPLAIN_COMMAND.length;

    if (isEscaped(latex, start)) continue;
    if (latex[cursor] && /[A-Za-z@]/.test(latex[cursor])) continue;

    const keyStart = skipWhitespace(latex, cursor);
    const keyGroup = readBracedGroup(latex, keyStart);
    if (!keyGroup) {
      fail(
        'malformed-explicit-binding',
        `${EXPLAIN_COMMAND} at offset ${start} is missing {semantic.key}.`,
        { start },
      );
    }
    const key = keyGroup.content.trim();
    if (!KEY_PATTERN.test(key)) {
      fail(
        'invalid-key',
        `Invalid semantic notation key "${key}" in ${EXPLAIN_COMMAND}.`,
        {
          key,
          start,
        },
      );
    }
    if (!definitionsByKey.has(key)) {
      fail(
        'unknown-explicit-key',
        `Explicit math binding at offset ${start} refers to unknown lesson-scoped key "${key}".`,
        { key, start },
      );
    }

    const latexStart = skipWhitespace(latex, keyGroup.end);
    const latexGroup = readBracedGroup(latex, latexStart);
    if (!latexGroup) {
      fail(
        'malformed-explicit-binding',
        `${EXPLAIN_COMMAND}{${key}} at offset ${start} is missing {latex}.`,
        { key, start },
      );
    }
    if (latexGroup.content.trim().length === 0) {
      fail(
        'malformed-explicit-binding',
        `${EXPLAIN_COMMAND}{${key}} at offset ${start} has empty {latex}.`,
        { key, start },
      );
    }

    calls.push({
      key,
      prefixEnd: latexStart,
      callStart: start,
      start: latexGroup.contentStart,
      end: latexGroup.contentEnd,
      token: latexGroup.content,
      level: 'explicit',
      match: 'explicit',
    });
  }

  return calls;
}

/** Blank out the `\explain{key}{` prefixes so KaTeX can parse what they wrap. */
function sourceWithoutExplainPrefixes(latex, calls) {
  if (calls.length === 0) return latex;
  const characters = [...latex];
  for (const call of calls) {
    for (let index = call.callStart; index < call.prefixEnd; index++) {
      if (!/\s/.test(characters[index])) characters[index] = ' ';
    }
  }
  return characters.join('');
}

// --- structural signatures --------------------------------------------

function signatureParts(node) {
  if (!isNode(node)) return [];

  if (node.type === 'ordgroup') return signatureValue(node.body);
  if (node.type === 'font' && node.font === 'mathrm') {
    return signatureValue(node.body);
  }
  if (node.type === 'mathord' || node.type === 'textord') {
    return [`ord:${node.text}`];
  }
  if (node.type === 'atom')
    return [`atom:${node.family ?? ''}:${node.text ?? ''}`];
  if (node.type === 'spacing') return [`space:${node.text ?? ''}`];
  if (node.type === 'op' || node.type === 'operatorname') {
    return [`operator:${node.name ?? node.type}`];
  }
  if (node.type === 'text')
    return [`text:${signatureValue(node.body).join('|')}`];
  if (node.type === 'supsub') {
    return [
      `supsub(${signatureValue(node.base).join('|')})` +
        `_(${signatureValue(node.sub).join('|')})` +
        `^(${signatureValue(node.sup).join('|')})`,
    ];
  }

  const primitive = [];
  for (const key of ['family', 'font', 'label', 'name', 'text']) {
    if (typeof node[key] === 'string') primitive.push(`${key}=${node[key]}`);
  }
  const children = [];
  for (const key of SOURCE_CHILD_KEYS) {
    if (node[key] !== undefined && node[key] !== null) {
      children.push(`${key}=[${signatureValue(node[key]).join('|')}]`);
    }
  }
  return [`${node.type}{${primitive.join(',')}}(${children.join(',')})`];
}

function signatureValue(value) {
  if (Array.isArray(value)) return value.flatMap(signatureValue);
  return signatureParts(value);
}

function sequenceSignature(nodes) {
  return nodes.flatMap(signatureParts).join('|');
}

// --- source spans -----------------------------------------------------

function nodeSpan(node) {
  let start = Number.POSITIVE_INFINITY;
  let end = Number.NEGATIVE_INFINITY;
  const visited = new Set();

  function visit(value) {
    if (!value || typeof value !== 'object' || visited.has(value)) return;
    visited.add(value);
    if (
      value.loc &&
      Number.isInteger(value.loc.start) &&
      Number.isInteger(value.loc.end)
    ) {
      start = Math.min(start, value.loc.start);
      end = Math.max(end, value.loc.end);
    }
    if (Array.isArray(value)) {
      for (const child of value) visit(child);
      return;
    }
    if (!isNode(value)) return;
    for (const key of SOURCE_CHILD_KEYS) visit(value[key]);
  }

  visit(node);
  return Number.isFinite(start) && Number.isFinite(end)
    ? { start, end }
    : undefined;
}

function sequenceSpan(nodes) {
  const spans = nodes.map(nodeSpan).filter(Boolean);
  if (spans.length === 0) return undefined;
  return {
    start: Math.min(...spans.map((span) => span.start)),
    end: Math.max(...spans.map((span) => span.end)),
  };
}

function childValues(node) {
  const children = [];
  for (const key of SOURCE_CHILD_KEYS) {
    const value = node[key];
    if (value !== undefined && value !== null) children.push(value);
  }
  return children;
}

function isIdentifierNode(node) {
  if (node.type !== 'mathord' && node.type !== 'textord') return false;
  if (typeof node.text !== 'string') return false;
  if (/^[0-9.,]+$/u.test(node.text)) return false;
  return /^(?:\p{L}|\\[A-Za-z]+)$/u.test(node.text);
}

const contains = (outer, inner) =>
  outer.start <= inner.start && inner.end <= outer.end;
const sameSpan = (left, right) =>
  left.start === right.start && left.end === right.end;

/**
 * Walk the parse tree once, collecting: every maximal run of sibling nodes
 * (`containers`, where a canonical form is matched), every identifier atom with
 * its source span, and the spans of every sub/superscript (so a symbol nested
 * in a script can still be marked).
 */
function collectSourceStructure(tree) {
  const containers = [];
  const identifiers = [];
  const scriptSpans = [];
  const seenContainers = new Set();
  const seenIdentifiers = new Set();

  function addContainer(nodes) {
    const usable = nodes.filter(isNode);
    if (usable.length === 0) return;
    const span = sequenceSpan(usable);
    if (!span) return;
    const identity = `${span.start}:${span.end}:${usable.length}:${sequenceSignature(usable)}`;
    if (seenContainers.has(identity)) return;
    seenContainers.add(identity);
    containers.push(usable);
  }

  function visitValue(value, ignored = false) {
    if (Array.isArray(value)) {
      if (!ignored && value.every(isNode)) addContainer(value);
      for (const child of value) visitValue(child, ignored);
      return;
    }
    if (!isNode(value)) return;

    const ignoredBody =
      ignored ||
      value.type === 'text' ||
      value.type === 'op' ||
      value.type === 'operatorname' ||
      (value.type === 'font' && value.font === ROMAN_LABEL_FONT) ||
      IGNORED_MATH_TOKENS.has(fontTokenText(value));

    if (!ignored && isIdentifierNode(value)) {
      const span = nodeSpan(value);
      if (span && !seenIdentifiers.has(`${span.start}:${span.end}`)) {
        seenIdentifiers.add(`${span.start}:${span.end}`);
        identifiers.push({
          node: value,
          signature: sequenceSignature([value]),
          ...span,
        });
      }
    }

    if (value.type === 'supsub') {
      for (const script of [value.sub, value.sup]) {
        const span = nodeSpan(script);
        if (span) scriptSpans.push(span);
      }
    }

    for (const child of childValues(value)) {
      if (Array.isArray(child)) {
        if (!ignoredBody && child.every(isNode)) addContainer(child);
        for (const nested of child) visitValue(nested, ignoredBody);
      } else if (isNode(child)) {
        if (!ignoredBody) addContainer([child]);
        visitValue(child, ignoredBody);
      }
    }
  }

  addContainer(tree);
  visitValue(tree);
  return { containers, identifiers, scriptSpans };
}

// --- base-glyph signatures ------------------------------------------

function identifierBaseSignature(node) {
  if (isIdentifierNode(node)) return sequenceSignature([node]);
  if (node?.type === 'supsub' && isIdentifierNode(node.base)) {
    return sequenceSignature([node.base]);
  }
  return undefined;
}

/**
 * The shorter page form a parameterized symbol also permits: the bare base
 * glyph of `t_k` / `r_m` / `j^{(m)}` (one significant node) or the head of a
 * function form `D(0,t)` / `V_0(1_t)` (head followed by `(`).
 */
function canonicalBaseSignature(tree) {
  const significant = tree.filter(
    (node) => node.type !== 'spacing' && node.type !== 'ordgroup',
  );
  if (significant.length === 1) return identifierBaseSignature(significant[0]);
  if (significant.length < 2) return undefined;
  const [head, open] = significant;
  if (open.type !== 'atom' || open.family !== 'open' || open.text !== '(') {
    return undefined;
  }
  return identifierBaseSignature(head);
}

/**
 * KaTeX puts source braces inside an ordgroup node's `loc`, but signatures
 * treat ordgroups as transparent. Peel a fully-enclosing `{…}` off a matched
 * span so `\frac{j}{m}` marks as `\frac{\explain{…}{j}}{…}`, not
 * `\frac\explain{…}{{j}}…`.
 */
function unwrapEnclosingGroupSpan(latex, span) {
  let { start, end } = span;
  while (latex[start] === '{') {
    const group = readBracedGroup(latex, start);
    if (!group || group.end !== end) break;
    start = group.contentStart;
    end = group.contentEnd;
  }
  return { start, end };
}

const FONT_WRAPPER_OPEN =
  /\\(?:mathbb|mathcal|mathfrak|mathscr|mathrm|mathbf|mathit)\{$/;

/**
 * KaTeX puts no `loc` on a `\mathbb{…}` font node, so a span derived from one
 * begins at the inner letter. When a matched span sits exactly inside a
 * single-letter font command, widen it to wrap the whole `\mathbb{E}` token so
 * the injected `\explain{…}{…}` stays brace-balanced.
 */
function expandFontWrapperSpan(latex, span) {
  const open = latex.slice(0, span.start).match(FONT_WRAPPER_OPEN);
  if (!open) return span;
  const group = readBracedGroup(latex, span.start - 1);
  if (!group || group.contentEnd - group.contentStart !== 1) return span;
  return {
    start: span.start - open[0].length,
    end: Math.max(span.end, group.end),
  };
}

/** A nested symbol may still be marked when it sits inside a script group. */
function isSafeScriptNesting(inner, outer, scriptSpans) {
  if (inner.start === outer.start) return false;
  return scriptSpans.some(
    (script) => contains(outer, script) && contains(script, inner),
  );
}

// --- glyph table + matching -----------------------------------------

/**
 * Index the page glyph table by structural signature. Because one glyph carries
 * one meaning per page, each signature maps to exactly one key; a genuine
 * structural clash between two keys is a page authoring error and fails here.
 */
function buildGlyphIndex(definitions) {
  if (!Array.isArray(definitions)) {
    fail(
      'invalid-definitions',
      'The page glyph table must be an array of {key, notation}.',
    );
  }

  const byKey = new Map();
  const bySignature = new Map();
  const byBase = new Map();
  const ambiguousBase = new Set();
  let maxNodeLength = 0;

  for (const [index, value] of definitions.entries()) {
    const key = value?.key;
    const notation = value?.notation;
    if (!KEY_PATTERN.test(key ?? '')) {
      fail(
        'invalid-key',
        `Invalid notation key at glyph-table index ${index}.`,
        {
          index,
          key,
        },
      );
    }
    if (typeof notation !== 'string' || notation.trim().length === 0) {
      fail('invalid-notation', `Glyph "${key}" must have non-empty LaTeX.`, {
        index,
        key,
        notation,
      });
    }
    if (byKey.has(key)) {
      fail(
        'duplicate-key',
        `Page glyph key "${key}" is defined more than once.`,
        {
          key,
        },
      );
    }

    const tree = parseMath(notation, `notation "${key}"`);
    const entry = { key, notation };
    byKey.set(key, entry);

    const signature = sequenceSignature(tree);
    const hasIdentifier = collectSourceStructure(tree).identifiers.length > 0;
    if (hasIdentifier && tree.length > 0) {
      const clash = bySignature.get(signature);
      if (clash && clash !== key) {
        fail(
          'ambiguous-canonical-notation',
          `Page glyphs "${clash}" and "${key}" have structurally identical LaTeX ("${notation}").`,
          { left: clash, right: key },
        );
      }
      bySignature.set(signature, key);
      maxNodeLength = Math.max(maxNodeLength, tree.length);
    }

    const baseSignature = canonicalBaseSignature(tree);
    if (baseSignature) {
      if (byBase.has(baseSignature) && byBase.get(baseSignature) !== key) {
        ambiguousBase.add(baseSignature);
      } else {
        byBase.set(baseSignature, key);
      }
    }
  }

  return { byKey, bySignature, byBase, ambiguousBase, maxNodeLength };
}

/** Bind whole canonical forms: greedy longest match, left to right, per run. */
function matchCanonicalForms(latex, containers, glyphs) {
  const bindings = [];
  const claimed = [];

  for (const container of containers) {
    let cursor = 0;
    while (cursor < container.length) {
      let step = 1;
      const maxLength = Math.min(
        glyphs.maxNodeLength,
        container.length - cursor,
      );
      for (let length = maxLength; length >= 1; length--) {
        const nodes = container.slice(cursor, cursor + length);
        const key = glyphs.bySignature.get(sequenceSignature(nodes));
        if (key === undefined) continue;
        const rawSpan = sequenceSpan(nodes);
        if (!rawSpan) continue;
        const span = expandFontWrapperSpan(
          latex,
          unwrapEnclosingGroupSpan(latex, rawSpan),
        );
        step = length;
        if (
          claimed.some(
            (existing) => sameSpan(existing, span) || contains(existing, span),
          )
        ) {
          break;
        }
        bindings.push({
          key,
          ...span,
          token: latex.slice(span.start, span.end),
          level: 'scope',
          match: 'canonical',
        });
        claimed.push(span);
        break;
      }
      cursor += step;
    }
  }

  return bindings;
}

/**
 * Bind the remaining identifier atoms to a unique base glyph. An atom already
 * inside a canonical match is skipped unless it sits in a script group; an atom
 * whose base glyph names two keys fails (the author must reach for `\explain`).
 */
function matchBaseGlyphs(latex, identifiers, canonical, glyphs, scriptSpans) {
  const bindings = [];
  for (const identifier of identifiers) {
    // An atom inside a region the author wrapped in an explicit `\explain{key}{…}`
    // is already accounted for by that call; never re-flag or re-bind it, even
    // when it also sits in a script inside a larger canonical match. (To bind a
    // nested glyph separately, wrap it in its own nested `\explain`.)
    if (
      canonical.some(
        (binding) =>
          binding.level === 'explicit' && contains(binding, identifier),
      )
    ) {
      continue;
    }

    const cover = canonical.find((binding) => contains(binding, identifier));
    if (cover && !isSafeScriptNesting(identifier, cover, scriptSpans)) continue;

    const baseSignature = identifier.signature;
    if (glyphs.ambiguousBase.has(baseSignature)) {
      const token = latex.slice(identifier.start, identifier.end);
      fail(
        'ambiguous-base-fallback',
        `Identifier "${token}" at ${identifier.start}:${identifier.end} is the base glyph of more than one page symbol; wrap it in \\explain{key}{${token}}.`,
        { token, start: identifier.start, end: identifier.end },
      );
    }
    const key = glyphs.byBase.get(baseSignature);
    if (key === undefined) continue;
    bindings.push({
      key,
      start: identifier.start,
      end: identifier.end,
      token: latex.slice(identifier.start, identifier.end),
      level: 'scope',
      match: 'base',
    });
  }
  return bindings;
}

/** Wrap every `level: 'scope'` binding in a `\explain{key}{…}` marker. */
function injectScopeBindings(latex, bindings) {
  const scopeBindings = bindings.filter(({ level }) => level === 'scope');
  const openings = new Map();
  const closings = new Map();

  const at = (map, index) => {
    if (!map.has(index)) map.set(index, []);
    return map.get(index);
  };
  for (const binding of scopeBindings) {
    let preceding = binding.start - 1;
    while (preceding >= 0 && /\s/.test(latex[preceding])) preceding -= 1;
    const insertion = {
      ...binding,
      scriptGroup: latex[preceding] === '_' || latex[preceding] === '^',
    };
    at(openings, binding.start).push(insertion);
    at(closings, binding.end).push(insertion);
  }

  let output = '';
  for (let index = 0; index <= latex.length; index++) {
    for (const binding of (closings.get(index) ?? []).sort(
      (left, right) => right.start - left.start,
    )) {
      output += binding.scriptGroup ? '}}' : '}';
    }
    for (const binding of (openings.get(index) ?? []).sort(
      (left, right) => right.end - left.end,
    )) {
      output += `${binding.scriptGroup ? '{' : ''}${EXPLAIN_COMMAND}{${binding.key}}{`;
    }
    if (index < latex.length) output += latex[index];
  }
  return output;
}

function unresolvedIdentifiers(latex, identifiers, bindings) {
  return identifiers
    .filter((identifier) => {
      const token = latex.slice(identifier.start, identifier.end);
      return (
        !BASE_LIBRARY.has(token) &&
        !bindings.some((binding) => contains(binding, identifier))
      );
    })
    .map(({ start, end }) => {
      // Report `\mathbb{E}`, not a bare `E`, so the fix hint points at the
      // whole token the author has to wrap in `\explain`.
      const wrapped = expandFontWrapperSpan(latex, { start, end });
      return {
        token: latex.slice(wrapped.start, wrapped.end),
        start: wrapped.start,
        end: wrapped.end,
      };
    })
    .sort((left, right) => left.start - right.start || left.end - right.end);
}

/**
 * Resolve and annotate one KaTeX expression against a page's flat glyph table.
 * Source offsets in the result always refer to the original, unmodified LaTeX.
 *
 * @param {string} latex
 * @param {Array<{key: string, notation: string}>} definitions
 */
export function resolveMathGlyphs(latex, definitions) {
  if (typeof latex !== 'string') {
    fail('invalid-latex-input', 'Math source must be a string.');
  }

  const glyphs = buildGlyphIndex(definitions);
  const explicitCalls = findExplainCalls(latex, glyphs.byKey);
  const tree = parseMath(
    sourceWithoutExplainPrefixes(latex, explicitCalls),
    'lesson math',
  );
  const { containers, identifiers, scriptSpans } = collectSourceStructure(tree);

  const canonical = matchCanonicalForms(latex, containers, glyphs);
  const covered = [...canonical, ...explicitCalls];
  const base = matchBaseGlyphs(
    latex,
    identifiers,
    covered,
    glyphs,
    scriptSpans,
  );

  const bindings = [...canonical, ...base, ...explicitCalls].sort(
    (left, right) =>
      left.start - right.start ||
      right.end - left.end ||
      (left.level === 'explicit' ? -1 : 1),
  );

  for (const [i, left] of bindings.entries()) {
    for (const right of bindings.slice(i + 1)) {
      if (sameSpan(left, right) && left.key !== right.key) {
        fail(
          'ambiguous-span',
          `Math span ${left.start}:${left.end} resolves to both "${left.key}" and "${right.key}".`,
          { left, right },
        );
      }
    }
  }

  return {
    latex: injectScopeBindings(latex, bindings),
    bindings: bindings.map(({ key, level, match, token }) => ({
      key,
      level,
      match,
      token,
    })),
    unresolved: unresolvedIdentifiers(latex, identifiers, bindings),
  };
}
