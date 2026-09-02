import katex from 'katex';

import { BASE_LIBRARY } from './base-library.mjs';

/**
 * Page-level glyph-map resolver (cleanup plan, D1 decision 2026-09-02).
 *
 * A page declares its glyphs once — `notation.local` plus the shared entries it
 * introduces in prose with `[[key]]` — and formulas stay ordinary LaTeX.
 * This module tokenizes one `$…$` / `$$…$$` expression into identifier atoms
 * and resolves each against that flat page glyph table plus the base library,
 * marking it with a validated `\explain` marker or reporting it unresolved so
 * the caller can fail at `file:line:token`. `\explain{key}{latex}` stays as the
 * escape hatch for a compound or glyph-colliding symbol.
 *
 * KaTeX's parse tree is intentionally an internal API. Keep this guard beside
 * the resolver so a dependency update cannot silently change its behavior.
 */
export const SUPPORTED_KATEX_PARSE_VERSION = '0.16.47';

const KEY_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const EXPLAIN_COMMAND = String.raw`\explain`;

// Letters inside these fonts are upright roman labels (`\mathrm{B}`) or
// universal set / operator symbols (`\mathbb{N}`, `\mathcal{F}`), not bindable
// identifier atoms. They are treated like the base library.
const IGNORED_FONTS = new Set([
  'mathrm',
  'mathbb',
  'mathcal',
  'mathfrak',
  'mathscr',
]);
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
      `Math binding expects KaTeX ${SUPPORTED_KATEX_PARSE_VERSION}, but ${katex.version} is installed. Review the internal parse-tree adapter before changing the pin.`,
      {
        expected: SUPPORTED_KATEX_PARSE_VERSION,
        actual: katex.version,
      },
    );
  }
}

function parseMath(latex, label) {
  assertPinnedKatex();

  try {
    return katex.__parse(latex, {
      throwOnError: true,
      strict: 'error',
    });
  } catch (error) {
    fail(
      'invalid-latex',
      `KaTeX could not parse ${label}: ${error instanceof Error ? error.message : String(error)}`,
      { label, latex },
    );
  }
}

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

function findExplainCalls(latex, definitionsByKey) {
  const calls = [];
  let cursor = 0;

  while (cursor < latex.length) {
    const start = latex.indexOf(EXPLAIN_COMMAND, cursor);
    if (start === -1) break;
    cursor = start + EXPLAIN_COMMAND.length;

    if (isEscaped(latex, start)) continue;
    const commandTail = latex[cursor];
    if (commandTail && /[A-Za-z@]/.test(commandTail)) continue;

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
        { key, start },
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
      callStart: start,
      callEnd: latexGroup.end,
      prefixEnd: latexStart,
      key,
      start: latexGroup.contentStart,
      end: latexGroup.contentEnd,
      token: latexGroup.content,
      level: 'explicit',
      match: 'explicit',
    });
  }

  return calls;
}

function sourceWithoutExplainPrefixes(latex, calls) {
  if (calls.length === 0) return latex;
  const characters = [...latex];

  for (const call of calls) {
    for (let index = call.callStart; index < call.prefixEnd; index++) {
      characters[index] = /\s/.test(characters[index])
        ? characters[index]
        : ' ';
    }
  }

  return characters.join('');
}

function signatureParts(node) {
  if (!isNode(node)) return [];

  if (node.type === 'ordgroup') return signatureValue(node.body);
  if (node.type === 'font' && node.font === 'mathrm') {
    return signatureValue(node.body);
  }
  if (node.type === 'mathord' || node.type === 'textord') {
    return [`ord:${node.text}`];
  }
  if (node.type === 'atom') {
    return [`atom:${node.family ?? ''}:${node.text ?? ''}`];
  }
  if (node.type === 'spacing') return [`space:${node.text ?? ''}`];
  if (node.type === 'op' || node.type === 'operatorname') {
    return [`operator:${node.name ?? node.type}`];
  }
  if (node.type === 'text') {
    return [`text:${signatureValue(node.body).join('|')}`];
  }
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
    if (value !== undefined && value !== null) children.push({ key, value });
  }
  return children;
}

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
      if (value.every(isNode) && !ignored) addContainer(value);
      for (const child of value) visitValue(child, ignored);
      return;
    }
    if (!isNode(value)) return;

    const ignoredBody =
      ignored ||
      value.type === 'text' ||
      value.type === 'op' ||
      value.type === 'operatorname' ||
      (value.type === 'font' && IGNORED_FONTS.has(value.font));

    if (!ignored && isIdentifierNode(value)) {
      const span = nodeSpan(value);
      if (span) {
        const identity = `${span.start}:${span.end}`;
        if (!seenIdentifiers.has(identity)) {
          seenIdentifiers.add(identity);
          identifiers.push({
            node: value,
            signature: sequenceSignature([value]),
            ...span,
          });
        }
      }
    }

    if (value.type === 'supsub') {
      for (const script of [value.sub, value.sup]) {
        const span = nodeSpan(script);
        if (span) scriptSpans.push(span);
      }
    }

    for (const { value: child } of childValues(value)) {
      if (Array.isArray(child)) {
        if (child.every(isNode) && !ignoredBody) addContainer(child);
        for (const nested of child) visitValue(nested, ignoredBody);
      } else if (isNode(child)) {
        if (!ignoredBody) addContainer([child]);
        visitValue(child, ignoredBody);
      } else if (Array.isArray(child)) {
        visitValue(child, ignoredBody);
      }
    }
  }

  addContainer(tree);
  visitValue(tree);
  return { containers, identifiers, scriptSpans };
}

function isIdentifierNode(node) {
  if (node.type !== 'mathord' && node.type !== 'textord') return false;
  if (typeof node.text !== 'string') return false;
  if (/^[0-9.,]+$/u.test(node.text)) return false;
  return /^(?:\p{L}|\\[A-Za-z]+)$/u.test(node.text);
}

function contains(outer, inner) {
  return outer.start <= inner.start && inner.end <= outer.end;
}

function properOverlap(left, right) {
  if (left.end <= right.start || right.end <= left.start) return false;
  return !contains(left, right) && !contains(right, left);
}

function sameSpan(left, right) {
  return left.start === right.start && left.end === right.end;
}

/**
 * Validate source spans independently of binding inference. Disjoint and
 * nested intervals are valid; identical intervals with different keys are
 * ambiguous; partially overlapping intervals are invalid.
 */
export function validateBindingSpans(spans, sourceLength = undefined) {
  const normalized = spans.map((span, index) => {
    if (
      !span ||
      typeof span.key !== 'string' ||
      !Number.isInteger(span.start) ||
      !Number.isInteger(span.end) ||
      span.start < 0 ||
      span.end <= span.start ||
      (sourceLength !== undefined && span.end > sourceLength)
    ) {
      fail('invalid-span', `Invalid math binding span at index ${index}.`, {
        index,
        span,
        sourceLength,
      });
    }
    return span;
  });

  for (let leftIndex = 0; leftIndex < normalized.length; leftIndex++) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < normalized.length;
      rightIndex++
    ) {
      const left = normalized[leftIndex];
      const right = normalized[rightIndex];

      if (sameSpan(left, right) && left.key !== right.key) {
        fail(
          'ambiguous-span',
          `Math span ${left.start}:${left.end} resolves to both "${left.key}" and "${right.key}".`,
          { left, right },
        );
      }
      if (properOverlap(left, right)) {
        fail(
          'partial-overlap',
          `Math bindings "${left.key}" (${left.start}:${left.end}) and "${right.key}" (${right.start}:${right.end}) partially overlap. Spans must be disjoint or nested.`,
          { left, right },
        );
      }
    }
  }

  return normalized;
}

function canonicalDefinitions(definitions) {
  if (!Array.isArray(definitions)) {
    fail(
      'invalid-definitions',
      'Lesson-scoped notation definitions must be an array of {key, notation}.',
    );
  }

  const byKey = new Map();
  const byCanonicalSignature = new Map();
  const normalized = [];

  for (const [index, value] of definitions.entries()) {
    const key = value?.key;
    const notation = value?.notation;
    if (!KEY_PATTERN.test(key ?? '')) {
      fail(
        'invalid-key',
        `Invalid notation key at definition index ${index}.`,
        {
          index,
          key,
        },
      );
    }
    if (typeof notation !== 'string' || notation.trim().length === 0) {
      fail(
        'invalid-notation',
        `Notation definition "${key}" must have non-empty LaTeX.`,
        { index, key, notation },
      );
    }
    if (byKey.has(key)) {
      fail(
        'duplicate-key',
        `Lesson-scoped notation key "${key}" is defined more than once.`,
        { key },
      );
    }

    const tree = parseMath(notation, `notation "${key}"`);
    const signature = sequenceSignature(tree);
    const existing = byCanonicalSignature.get(signature);
    if (existing && existing.key !== key) {
      fail(
        'ambiguous-canonical-notation',
        `Canonical notation "${notation}" for "${key}" is structurally indistinguishable from "${existing.notation}" for "${existing.key}".`,
        { left: existing, right: { key, notation } },
      );
    }

    const identifiers = collectSourceStructure(tree).identifiers;
    const definition = {
      key,
      notation,
      tree,
      signature,
      nodeLength: tree.length,
      autoMatch: identifiers.length > 0,
      fallbackSignature: canonicalBaseSignature(tree),
    };
    byKey.set(key, definition);
    byCanonicalSignature.set(signature, definition);
    normalized.push(definition);
  }

  return { byKey, definitions: normalized };
}

function identifierBaseSignature(node) {
  if (isIdentifierNode(node)) return sequenceSignature([node]);
  if (node?.type === 'supsub' && isIdentifierNode(node.base)) {
    return sequenceSignature([node.base]);
  }
  return undefined;
}

function canonicalBaseSignature(tree) {
  const significant = tree.filter(
    (node) => !(node.type === 'spacing' || node.type === 'ordgroup'),
  );

  // Parameterized canonical symbols such as t_k, r_m, j^(m), and
  // y^(m_B) deliberately allow the undecorated base glyph as a shorter page
  // form when that base identifies exactly one definition in lesson scope.
  if (significant.length === 1) {
    return identifierBaseSignature(significant[0]);
  }

  // Function-like notation may have either a plain head (D(0,t)) or a
  // decorated head (V_0(1_t)). Bind its unique head when the arguments are
  // concrete instances rather than the canonical placeholders.
  if (significant.length < 2) return undefined;
  const [head, open] = significant;
  if (open.type !== 'atom' || open.family !== 'open' || open.text !== '(') {
    return undefined;
  }
  return identifierBaseSignature(head);
}

function unwrapEnclosingGroupSpan(latex, span) {
  let start = span.start;
  let end = span.end;

  // KaTeX includes source braces in an ordgroup node's location even though
  // signatureParts deliberately treats that node as transparent. Matching a
  // canonical symbol inside a macro argument must therefore keep the braces
  // outside the injected marker: `\frac{j}{m}` must become
  // `\frac{\explain{...}{j}}{\explain{...}{m}}`, not
  // `\frac\explain{...}{{j}}\explain{...}{{m}}`.
  while (latex[start] === '{') {
    const group = readBracedGroup(latex, start);
    if (!group || group.end !== end) break;
    start = group.contentStart;
    end = group.contentEnd;
  }

  return { start, end };
}

function exactCandidates(latex, source, definitions) {
  const candidates = [];
  const seen = new Set();

  for (const definition of definitions) {
    if (!definition.autoMatch || definition.nodeLength === 0) continue;

    for (const container of source.containers) {
      if (container.length < definition.nodeLength) continue;

      for (
        let offset = 0;
        offset <= container.length - definition.nodeLength;
        offset++
      ) {
        const nodes = container.slice(offset, offset + definition.nodeLength);
        if (sequenceSignature(nodes) !== definition.signature) continue;
        const rawSpan = sequenceSpan(nodes);
        if (!rawSpan) continue;
        const span = unwrapEnclosingGroupSpan(latex, rawSpan);

        const identity = `${definition.key}:${span.start}:${span.end}`;
        if (seen.has(identity)) continue;
        seen.add(identity);
        candidates.push({
          key: definition.key,
          notation: definition.notation,
          start: span.start,
          end: span.end,
          token: latex.slice(span.start, span.end),
          level: 'scope',
          match: 'canonical',
        });
      }
    }
  }

  return candidates;
}

function isSafeScriptNesting(candidate, outer, scriptSpans) {
  if (candidate.start === outer.start) return false;
  return scriptSpans.some(
    (script) => contains(outer, script) && contains(script, candidate),
  );
}

function selectExactBindings(candidates, explicit, scriptSpans) {
  validateBindingSpans(candidates);
  validateBindingSpans(explicit);

  const ordered = [...candidates, ...explicit].sort(
    (left, right) =>
      left.start - right.start ||
      right.end - left.end ||
      (left.level === 'explicit' ? -1 : 1),
  );
  const selected = [];

  for (const candidate of ordered) {
    const identical = selected.find((binding) => sameSpan(binding, candidate));
    if (identical) {
      if (identical.key !== candidate.key) {
        if (identical.level === 'explicit') continue;
        if (candidate.level === 'explicit') {
          selected.splice(selected.indexOf(identical), 1, candidate);
          continue;
        }
        fail(
          'ambiguous-span',
          `Math span ${candidate.start}:${candidate.end} matches both "${identical.key}" and "${candidate.key}".`,
          { left: identical, right: candidate },
        );
      }
      continue;
    }

    const containing = selected
      .filter((binding) => contains(binding, candidate))
      .sort(
        (left, right) => left.end - left.start - (right.end - right.start),
      )[0];

    if (
      containing &&
      candidate.level !== 'explicit' &&
      !isSafeScriptNesting(candidate, containing, scriptSpans)
    ) {
      continue;
    }

    selected.push(candidate);
  }

  validateBindingSpans(selected);
  return selected;
}

function fallbackBindings(latex, identifiers, definitions, selected) {
  const byHead = new Map();
  for (const definition of definitions) {
    if (!definition.fallbackSignature) continue;
    const matches = byHead.get(definition.fallbackSignature) ?? [];
    matches.push(definition);
    byHead.set(definition.fallbackSignature, matches);
  }

  const bindings = [];
  for (const identifier of identifiers) {
    if (selected.some((binding) => contains(binding, identifier))) continue;
    const candidates = byHead.get(identifier.signature) ?? [];
    if (candidates.length === 0) continue;
    if (candidates.length > 1) {
      fail(
        'ambiguous-base-fallback',
        `Identifier "${latex.slice(identifier.start, identifier.end)}" at ${identifier.start}:${identifier.end} is the canonical base of multiple lesson-scoped definitions: ${candidates.map(({ key }) => `"${key}"`).join(', ')}.`,
        {
          token: latex.slice(identifier.start, identifier.end),
          start: identifier.start,
          end: identifier.end,
          keys: candidates.map(({ key }) => key),
        },
      );
    }

    const [definition] = candidates;
    bindings.push({
      key: definition.key,
      notation: definition.notation,
      start: identifier.start,
      end: identifier.end,
      token: latex.slice(identifier.start, identifier.end),
      level: 'scope',
      match: 'base',
    });
  }

  return bindings;
}

function injectScopeBindings(latex, bindings) {
  const scopeBindings = bindings.filter(({ level }) => level === 'scope');
  const openings = new Map();
  const closings = new Map();

  for (const binding of scopeBindings) {
    let preceding = binding.start - 1;
    while (preceding >= 0 && /\s/.test(latex[preceding])) preceding -= 1;
    const insertion = {
      ...binding,
      scriptGroup: latex[preceding] === '_' || latex[preceding] === '^',
    };

    const atStart = openings.get(binding.start) ?? [];
    atStart.push(insertion);
    openings.set(binding.start, atStart);

    const atEnd = closings.get(binding.end) ?? [];
    atEnd.push(insertion);
    closings.set(binding.end, atEnd);
  }

  let output = '';
  for (let index = 0; index <= latex.length; index++) {
    const ending = (closings.get(index) ?? []).sort(
      (left, right) => right.start - left.start,
    );
    for (const binding of ending) {
      output += binding.scriptGroup ? '}}' : '}';
    }

    const starting = (openings.get(index) ?? []).sort(
      (left, right) => right.end - left.end,
    );
    for (const binding of starting) {
      output += `${binding.scriptGroup ? '{' : ''}${EXPLAIN_COMMAND}{${binding.key}}{`;
    }

    if (index < latex.length) output += latex[index];
  }

  return output;
}

function unresolvedIdentifiers(latex, identifiers, bindings, ignored) {
  return identifiers
    .filter((identifier) => {
      const token = latex.slice(identifier.start, identifier.end);
      return (
        !ignored.has(token) &&
        !bindings.some((binding) => contains(binding, identifier))
      );
    })
    .map(({ start, end }) => ({
      token: latex.slice(start, end),
      start,
      end,
    }))
    .sort((left, right) => left.start - right.start || left.end - right.end);
}

/**
 * Resolve and annotate one KaTeX expression against a page's flat glyph table
 * (its `notation.local` entries plus the shared entries it introduces with
 * `[[key]]`). Each entry's canonical LaTeX is matched structurally, then a
 * unique base glyph is matched for shorter or instantiated forms; every
 * remaining identifier atom that is not in the base library is reported
 * unresolved. The returned source offsets always refer to the original,
 * unmodified LaTeX.
 *
 * @param {string} latex
 * @param {Array<{key: string, notation: string}>} definitions
 * @param {{ignoredIdentifiers?: Iterable<string>}} [options]
 */
export function resolveMathGlyphs(latex, definitions, options = {}) {
  if (typeof latex !== 'string') {
    fail('invalid-latex-input', 'Math source must be a string.');
  }

  const canonical = canonicalDefinitions(definitions);
  const explicitCalls = findExplainCalls(latex, canonical.byKey);
  const parseableSource = sourceWithoutExplainPrefixes(latex, explicitCalls);
  const tree = parseMath(parseableSource, 'lesson math');
  const source = collectSourceStructure(tree);
  const candidates = exactCandidates(latex, source, canonical.definitions);
  const exact = selectExactBindings(
    candidates,
    explicitCalls,
    source.scriptSpans,
  );
  const fallback = fallbackBindings(
    latex,
    source.identifiers,
    canonical.definitions,
    exact,
  );
  const bindings = [...exact, ...fallback].sort(
    (left, right) =>
      left.start - right.start ||
      right.end - left.end ||
      (left.level === 'explicit' ? -1 : 1),
  );

  validateBindingSpans(bindings, latex.length);
  const ignored = new Set([
    ...BASE_LIBRARY,
    ...(options.ignoredIdentifiers ?? []),
  ]);

  return {
    latex: injectScopeBindings(latex, bindings),
    bindings: bindings.map(
      ({ key, notation, start, end, token, level, match }) => ({
        key,
        notation,
        level,
        match,
        start,
        end,
        token,
      }),
    ),
    unresolved: unresolvedIdentifiers(
      latex,
      source.identifiers,
      bindings,
      ignored,
    ),
  };
}
