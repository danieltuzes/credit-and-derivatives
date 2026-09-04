/**
 * Under-specification safeguard for notation `meaning` prose (Phase C1b).
 *
 * A page-local symbol must not get a glossary-style panel for a throwaway
 * definition, so `meaning` has to be real prose: at least four words and not a
 * placeholder phrase. Used by the content schema (`src/content.config.ts`) and
 * the loader so a bad entry fails both `astro check` and `validate:content`.
 */

/** Placeholder phrases that do not count as a substantive `meaning`. */
export const PLACEHOLDER_PROSE =
  /^(?:a\s+(?:variable|value|quantity|constant|parameter|symbol)|tbd|todo|fixme|see\s+above|as\s+above|placeholder|n\/a)\.?$/i;

/** Minimum words for a `meaning` to read as a definition rather than a label. */
export const MEANING_MIN_WORDS = 4;

export function isSubstantiveMeaning(value: string): boolean {
  const trimmed = value.trim();
  if (PLACEHOLDER_PROSE.test(trimmed)) return false;
  return trimmed.split(/\s+/).filter(Boolean).length >= MEANING_MIN_WORDS;
}
