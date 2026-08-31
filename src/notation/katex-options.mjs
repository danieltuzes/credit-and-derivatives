import { NOTATION_KEY_PATTERN } from './remark-notation.mjs';

export const EXPLAIN_MACRO = String.raw`\htmlData{notation-key=#1}{#2}`;

// Interactive labs render developer-authored math templates that carry two
// kinds of inert marker: `\explain` for a notation key (as above) and `\slot`
// for a numeric hole the island rewrites at runtime. Both compile to a single
// `data-*` attribute and nothing else.
export const SLOT_MACRO = String.raw`\htmlData{lab-slot=#1}{#2}`;
const LAB_SLOT_PATTERN = /^[a-z][a-z0-9]*$/;

/**
 * KaTeX trust callback that permits exactly one inert marker attribute:
 * `data-notation-key` (a registry key) or `data-lab-slot` (a lab value hole).
 * Links, styles, classes, IDs, protocols, and every other data attribute stay
 * untrusted. Key existence is checked by the remark adapter, the lab-math
 * renderer, and the workspace validator before KaTeX runs.
 */
export function trustNotationMarker(context) {
  if (context?.command !== '\\htmlData') return false;
  if (!context.attributes || typeof context.attributes !== 'object') {
    return false;
  }

  const entries = Object.entries(context.attributes);
  if (entries.length !== 1) return false;
  const [name, value] = entries[0];
  if (typeof value !== 'string') return false;

  if (name === 'data-notation-key') return NOTATION_KEY_PATTERN.test(value);
  if (name === 'data-lab-slot') return LAB_SLOT_PATTERN.test(value);
  return false;
}

function strictNotation(errorCode) {
  // The trusted macros intentionally use KaTeX's HTML extension. Keep normal
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
    '\\slot': SLOT_MACRO,
  }),
});

/**
 * Add non-security KaTeX settings while keeping the notation macros and trust
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
  if (overrides.macros?.['\\slot'] !== undefined) {
    throw new TypeError('The \\slot KaTeX macro cannot be overridden.');
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
      '\\slot': SLOT_MACRO,
    },
  };
}
