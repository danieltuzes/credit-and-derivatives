import { NOTATION_KEY_PATTERN } from './remark-notation.mjs';

export const EXPLAIN_MACRO = String.raw`\htmlData{notation-key=#1}{#2}`;

/**
 * KaTeX trust callback that permits exactly one inert semantic marker.
 * Links, styles, classes, IDs, protocols, and arbitrary data attributes stay
 * untrusted. Cross-entry existence is checked by the remark adapter and the
 * workspace validator before KaTeX runs.
 */
export function trustNotationMarker(context) {
  if (context?.command !== '\\htmlData') return false;
  if (!context.attributes || typeof context.attributes !== 'object') {
    return false;
  }

  const entries = Object.entries(context.attributes);
  return (
    entries.length === 1 &&
    entries[0][0] === 'data-notation-key' &&
    typeof entries[0][1] === 'string' &&
    NOTATION_KEY_PATTERN.test(entries[0][1])
  );
}

function strictNotation(errorCode) {
  // The trusted macro intentionally uses KaTeX's HTML extension. Keep normal
  // strict-mode warnings for all other non-LaTeX constructs.
  return errorCode === 'htmlExtension' ? 'ignore' : 'warn';
}

export const notationKatexOptions = Object.freeze({
  output: 'htmlAndMathml',
  throwOnError: true,
  strict: strictNotation,
  trust: trustNotationMarker,
  macros: Object.freeze({
    '\\explain': EXPLAIN_MACRO,
  }),
});

/**
 * Add non-security KaTeX settings while keeping the notation macro and trust
 * boundary non-overridable.
 */
export function createNotationKatexOptions(overrides = {}) {
  if ('output' in overrides) {
    throw new TypeError(
      'The notation KaTeX output mode cannot be overridden; HTML and MathML are required.',
    );
  }
  if ('throwOnError' in overrides) {
    throw new TypeError(
      'The notation KaTeX error mode cannot be overridden; rendering errors must fail the build.',
    );
  }
  if ('trust' in overrides) {
    throw new TypeError(
      'The notation KaTeX trust callback cannot be overridden.',
    );
  }
  if (overrides.macros?.['\\explain'] !== undefined) {
    throw new TypeError('The \\explain KaTeX macro cannot be overridden.');
  }

  return {
    ...notationKatexOptions,
    ...overrides,
    output: notationKatexOptions.output,
    throwOnError: notationKatexOptions.throwOnError,
    trust: trustNotationMarker,
    macros: {
      ...(overrides.macros ?? {}),
      '\\explain': EXPLAIN_MACRO,
    },
  };
}
