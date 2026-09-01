/**
 * Remark adapter for semantic notation references.
 *
 * Author syntax:
 *   - Prose introduces a meaning: `\\term{rates.discount-factor}`
 *   - Later math uses ordinary LaTeX: `D(0,t)`
 *   - `\\explain{rates.discount-factor}{D(0,t)}` remains available when
 *     lexical scope cannot select one meaning unambiguously.
 *
 * Prose references become ordinary links. Lesson math is resolved against
 * page-local definitions and explicit shared imports, then the adapter injects
 * the narrowly trusted `\\explain` marker before build-time KaTeX rendering.
 *
 * Definitions can be supplied as a Map, an array, an object keyed by the
 * semantic key, or a loader returning one of those forms. Loaders are
 * evaluated for every document transform so a long-running development
 * server can discover definitions created after startup. A resolver can
 * provide page-local lexical scoping:
 *
 *   remarkNotation({
 *     definitions: sharedDefinitions,
 *     resolve(key, { file, kind, localDefinitions, sharedDefinitions }) {
 *       return localDefinitions.get(key) ?? sharedDefinitions.get(key);
 *     },
 *   })
 *
 * A definition may be either its data object or an Astro collection entry
 * with the data object under `.data`.
 */

export const NOTATION_KEY_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

import { MathBindingError, bindMathNotation } from './math-bindings.mjs';

const PROSE_SKIP_TYPES = new Set([
  'code',
  'definition',
  'html',
  'image',
  'imageReference',
  'inlineCode',
  'link',
  'linkReference',
  'math',
  'mdxFlowExpression',
  'mdxTextExpression',
  'mdxjsEsm',
  'toml',
  'yaml',
]);

const TERM_PATTERN = /\\term\{([^{}]+)\}/g;
const TERM_OPEN = '\\term{';
const EXPLAIN = '\\explain';
const HTML_DATA = '\\htmlData';

function definitionData(value, fallbackKey) {
  const data = value?.data ?? value;
  if (!data || typeof data !== 'object') return undefined;

  const key = data.key ?? fallbackKey;
  if (typeof key !== 'string') return undefined;

  return { ...data, key };
}

function definitionsMap(input) {
  const definitions = new Map();
  if (!input) return definitions;

  if (input instanceof Map) {
    for (const [key, value] of input) {
      const definition = definitionData(value, key);
      if (definition) definitions.set(definition.key, definition);
    }
    return definitions;
  }

  if (Array.isArray(input)) {
    for (const value of input) {
      const definition = definitionData(value);
      if (definition) definitions.set(definition.key, definition);
    }
    return definitions;
  }

  for (const [key, value] of Object.entries(input)) {
    const definition = definitionData(value, key);
    if (definition) definitions.set(definition.key, definition);
  }
  return definitions;
}

function localDefinitionsFromFile(file) {
  const candidates = [
    file?.data?.astro?.frontmatter?.notation?.local,
    file?.data?.frontmatter?.notation?.local,
    file?.data?.notation?.local,
  ];

  return definitionsMap(candidates.find(Array.isArray));
}

// Registry definition pages (`src/content/notation/*.md`) carry their own
// worked equations. They have no `notation.uses` import list, so their math is
// bound against the whole shared registry: an author writes ordinary LaTeX (or
// an explicit `\explain{key}{latex}`) and every canonical symbol resolves.
const NOTATION_REGISTRY_PATH = /[\\/]content[\\/]notation[\\/][^\\/]+\.md$/;

function isNotationRegistryFile(file) {
  const candidates = [file?.path, file?.history?.[0], file?.data?.file];
  return candidates.some(
    (value) => typeof value === 'string' && NOTATION_REGISTRY_PATH.test(value),
  );
}

function lessonNotationFromFile(file) {
  const frontmatter =
    file?.data?.astro?.frontmatter ?? file?.data?.frontmatter ?? file?.data;
  const lessonId = frontmatter?.lessonId;
  const uses = frontmatter?.notation?.uses;
  return {
    lessonId: typeof lessonId === 'string' ? lessonId : undefined,
    uses: new Set(
      Array.isArray(uses) ? uses.filter((key) => typeof key === 'string') : [],
    ),
  };
}

function lessonScopedMathDefinitions(
  lessonNotation,
  localDefinitions,
  sharedDefinitions,
) {
  if (!lessonNotation.lessonId) return [];

  return [
    ...localDefinitions.values(),
    ...[...lessonNotation.uses]
      .map((key) => sharedDefinitions.get(key))
      .filter(Boolean),
  ].map((definition) => ({
    key: definition.key,
    notation: definition.notation,
  }));
}

function replaceMathSource(node, latex) {
  node.value = latex;

  // mdast-util-math snapshots the original source into `data.hChildren`
  // while parsing. mdast-to-hast prefers that snapshot over `node.value`, so
  // both representations must change or rehype-katex will render the stale,
  // unbound source even though this remark node was updated.
  const hastChildren = node?.data?.hChildren;
  if (!Array.isArray(hastChildren)) return;

  if (node.type === 'inlineMath') {
    node.data.hChildren = [{ type: 'text', value: latex }];
    return;
  }

  const code = hastChildren.find(
    (child) =>
      child?.type === 'element' &&
      child.tagName === 'code' &&
      Array.isArray(child.children),
  );
  if (code) code.children = [{ type: 'text', value: latex }];
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
    const character = value[cursor];
    if (isEscaped(value, cursor)) continue;

    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        return {
          content: value.slice(start + 1, cursor),
          end: cursor + 1,
        };
      }
    }
  }

  return undefined;
}

function fail(file, message, node) {
  if (typeof file?.fail === 'function') file.fail(message, node);

  const location = file?.path ? `${file.path}: ` : '';
  throw new Error(`${location}${message}`);
}

function warn(file, message, node) {
  if (typeof file?.message === 'function') {
    file.message(message, node);
    return;
  }
  console.warn(message);
}

function firstUnescaped(value, marker, from = 0) {
  let index = value.indexOf(marker, from);
  while (index !== -1 && isEscaped(value, index)) {
    index = value.indexOf(marker, index + marker.length);
  }
  return index;
}

function defaultHref(definition, key) {
  if (typeof definition?.href === 'string') return definition.href;
  if (definition?.scope === 'local') return `#notation-${key}`;
  return `/glossary/#notation-${key}`;
}

function proseNodes(value, resolve, file, node, references) {
  const strayExplain = firstUnescaped(value, EXPLAIN);
  if (strayExplain !== -1) {
    fail(
      file,
      `${EXPLAIN}{key}{latex} is only supported inside $...$ or $$...$$ math.`,
      node,
    );
  }

  const output = [];
  let cursor = 0;
  let match;
  TERM_PATTERN.lastIndex = 0;

  while ((match = TERM_PATTERN.exec(value))) {
    if (isEscaped(value, match.index)) continue;

    const key = match[1].trim();
    if (!NOTATION_KEY_PATTERN.test(key)) {
      fail(file, `Invalid notation key "${key}" in ${TERM_OPEN}...}.`, node);
    }

    if (match.index > cursor) {
      output.push({ type: 'text', value: value.slice(cursor, match.index) });
    }

    const definition = resolve(key, 'prose', node);
    const title = definition?.title ?? key;
    const summary = definition?.summary;
    const href = defaultHref(definition, key);

    const properties = {
      className: ['notation-term'],
      'data-notation-key': key,
      'data-notation-trigger': '',
    };
    if (typeof summary === 'string' && summary.length > 0) {
      properties['data-notation-summary'] = summary;
    }

    output.push({
      type: 'link',
      url: href,
      title: typeof summary === 'string' ? summary : undefined,
      children: [{ type: 'text', value: title }],
      data: { hProperties: properties },
    });
    references.push({ key, kind: 'prose' });
    cursor = match.index + match[0].length;
  }

  if (cursor === 0) {
    const malformed = firstUnescaped(value, TERM_OPEN);
    if (malformed !== -1) {
      fail(
        file,
        `Malformed notation reference near "${value.slice(malformed, malformed + 40)}". Expected ${TERM_OPEN}semantic.key}.`,
        node,
      );
    }
    return undefined;
  }

  if (cursor < value.length) {
    output.push({ type: 'text', value: value.slice(cursor) });
  }

  const remainder = output
    .filter((child) => child.type === 'text')
    .map((child) => child.value)
    .join('');
  const malformed = firstUnescaped(remainder, TERM_OPEN);
  if (malformed !== -1) {
    fail(
      file,
      `Malformed notation reference. Expected ${TERM_OPEN}semantic.key}.`,
      node,
    );
  }

  return output;
}

function inspectExplainCalls(value, resolve, file, node, references) {
  let htmlDataStart = firstUnescaped(value, HTML_DATA);
  while (htmlDataStart !== -1) {
    const next = value[htmlDataStart + HTML_DATA.length];
    if (!next || !/[A-Za-z]/.test(next)) {
      fail(
        file,
        `Direct ${HTML_DATA} commands are not allowed; use ${EXPLAIN}{semantic.key}{latex} so notation markers are validated.`,
        node,
      );
    }
    htmlDataStart = firstUnescaped(
      value,
      HTML_DATA,
      htmlDataStart + HTML_DATA.length,
    );
  }

  let cursor = 0;

  while (cursor < value.length) {
    const start = firstUnescaped(value, EXPLAIN, cursor);
    if (start === -1) return;

    const afterName = start + EXPLAIN.length;
    const next = value[afterName];
    if (next && /[A-Za-z]/.test(next)) {
      cursor = afterName;
      continue;
    }
    if (next === '[') {
      fail(
        file,
        'Inline notation definitions such as \\explain[def] are not supported; define the entry in lesson frontmatter or the notation collection.',
        node,
      );
    }

    const keyStart = skipWhitespace(value, afterName);
    const keyGroup = readBracedGroup(value, keyStart);
    if (!keyGroup) {
      fail(file, `Malformed ${EXPLAIN}: missing {semantic.key}.`, node);
    }

    const key = keyGroup.content.trim();
    if (!NOTATION_KEY_PATTERN.test(key)) {
      fail(file, `Invalid notation key "${key}" in ${EXPLAIN}.`, node);
    }

    const latexStart = skipWhitespace(value, keyGroup.end);
    const latexGroup = readBracedGroup(value, latexStart);
    if (!latexGroup) {
      fail(file, `Malformed ${EXPLAIN}{${key}}: missing {latex}.`, node);
    }
    if (latexGroup.content.trim().length === 0) {
      fail(file, `Empty LaTeX body in ${EXPLAIN}{${key}}.`, node);
    }

    resolve(key, 'math', node);
    references.push({ key, kind: 'math' });

    // Nested annotations are legal and retain their own semantic target.
    inspectExplainCalls(latexGroup.content, resolve, file, node, references);
    cursor = latexGroup.end;
  }
}

/**
 * @param {{
 *   definitions?: Map<string, object> | readonly object[] | Record<string, object> | (() => Map<string, object> | readonly object[] | Record<string, object>),
 *   resolve?: (key: string, context: object) => object | undefined,
 *   unknown?: 'error' | 'warn' | 'ignore',
 * }} [options]
 */
export default function remarkNotation(options = {}) {
  const unknown = options.unknown ?? 'error';

  return function transform(tree, file) {
    const suppliedDefinitions =
      typeof options.definitions === 'function'
        ? options.definitions()
        : options.definitions;
    const sharedDefinitions = definitionsMap(suppliedDefinitions);
    const registryMathDefinitions = [...sharedDefinitions.values()].map(
      (definition) => ({ key: definition.key, notation: definition.notation }),
    );
    const localDefinitions = localDefinitionsFromFile(file);
    const lessonNotation = lessonNotationFromFile(file);
    const registryFile = isNotationRegistryFile(file);
    const mathDefinitions = lessonScopedMathDefinitions(
      lessonNotation,
      localDefinitions,
      sharedDefinitions,
    );
    const references = [];
    const resolved = new Map();

    const resolve = (key, kind, node) => {
      const context = {
        file,
        kind,
        localDefinitions,
        sharedDefinitions,
      };
      const rawResult = definitionData(
        options.resolve?.(key, context) ??
          localDefinitions.get(key) ??
          sharedDefinitions.get(key),
        key,
      );
      const result = rawResult
        ? {
            ...rawResult,
            scope:
              rawResult.scope ??
              (localDefinitions.has(key) ? 'local' : 'shared'),
          }
        : undefined;

      if (
        lessonNotation.lessonId &&
        !localDefinitions.has(key) &&
        !lessonNotation.uses.has(key)
      ) {
        fail(
          file,
          `Notation key "${key}" is used in ${lessonNotation.lessonId} but is not imported by notation.uses.`,
          node,
        );
      }

      if (!result) {
        const message = `Unknown notation key "${key}" in ${kind}.`;
        if (unknown === 'error') fail(file, message, node);
        if (unknown === 'warn') warn(file, message, node);
        return undefined;
      }

      resolved.set(key, result);
      return result;
    };

    const visit = (node, skipped = false) => {
      if (!node || typeof node !== 'object') return;

      if (node.type === 'math' || node.type === 'inlineMath') {
        const value = String(node.value ?? '');
        inspectExplainCalls(value, resolve, file, node, references);

        const bindingScope = lessonNotation.lessonId
          ? mathDefinitions
          : registryFile
            ? registryMathDefinitions
            : undefined;

        if (bindingScope) {
          const context = lessonNotation.lessonId
            ? 'lesson math'
            : 'notation definition math';

          let result;
          try {
            result = bindMathNotation(value, bindingScope);
          } catch (error) {
            const message =
              error instanceof MathBindingError
                ? error.message
                : `Could not resolve ${context}: ${
                    error instanceof Error ? error.message : String(error)
                  }`;
            fail(file, message, node);
          }

          if (result.unresolved.length > 0) {
            const unresolved = result.unresolved
              .map(({ token, start }) => `"${token}" at offset ${start}`)
              .join(', ');
            fail(
              file,
              `Unresolved notation in ${context}: ${unresolved}. Introduce and import or locally define every variable, or wrap it in \\explain{key}{latex}.`,
              node,
            );
          }

          for (const binding of result.bindings) {
            if (binding.level === 'explicit') continue;
            resolve(binding.key, 'math', node);
            references.push({ key: binding.key, kind: 'math' });
          }
          replaceMathSource(node, result.latex);
        }
        return;
      }

      // MDX component attributes and expressions are not children in the
      // Markdown AST. The component's child Markdown is still lesson content
      // and must pass through notation resolution; otherwise wrapping an
      // equation in a presentation component silently disables completeness.
      const skipChildren = skipped || PROSE_SKIP_TYPES.has(node.type);
      if (skipChildren || !Array.isArray(node.children)) return;

      for (let index = 0; index < node.children.length; index++) {
        const child = node.children[index];
        if (child?.type === 'text') {
          const replacement = proseNodes(
            String(child.value ?? ''),
            resolve,
            file,
            child,
            references,
          );
          if (replacement) {
            node.children.splice(index, 1, ...replacement);
            index += replacement.length - 1;
          }
          continue;
        }
        visit(child, false);
      }
    };

    visit(tree);

    file.data.notationReferences = references;
    file.data.notationResolved = Object.fromEntries(resolved);
  };
}
