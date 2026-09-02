/**
 * Pure helpers for turning a source record plus a per-citation locator into
 * the strings shown in the inline panel and the end-of-page reference list.
 *
 * Imported by both the remark adapter (build-time list rendering) and the
 * `CitationLayer` island (hover panel), so it must not touch the DOM, the
 * file system, or Astro APIs.
 */

export const SOURCE_ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

const ORDINAL_SUFFIX = (value) => {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return String(value);
  const tens = number % 100;
  if (tens >= 11 && tens <= 13) return `${number}th`;
  switch (number % 10) {
    case 1:
      return `${number}st`;
    case 2:
      return `${number}nd`;
    case 3:
      return `${number}rd`;
    default:
      return `${number}th`;
  }
};

/**
 * Short author label: one surname, "A & B" for two, "A et al." for more.
 * Falls back to the publishing organization for official guidance.
 *
 * @param {Record<string, unknown>} record
 * @returns {string}
 */
export function formatAuthors(record) {
  const authors = Array.isArray(record.authors) ? record.authors : [];
  const surnames = authors
    .map((name) => String(name).trim().split(/\s+/).at(-1) ?? '')
    .filter(Boolean);

  if (surnames.length === 1) return surnames[0];
  if (surnames.length === 2) return `${surnames[0]} & ${surnames[1]}`;
  if (surnames.length > 2) return `${surnames[0]} et al.`;

  return typeof record.organization === 'string' ? record.organization : '';
}

/**
 * The "(4th ed., 2022)" tail, omitting whichever parts are absent.
 *
 * @param {Record<string, unknown>} record
 * @returns {string}
 */
export function formatEditionYear(record) {
  const parts = [];
  if (record.edition !== undefined && record.edition !== '') {
    parts.push(`${ORDINAL_SUFFIX(record.edition)} ed.`);
  }
  if (typeof record.year === 'number') parts.push(String(record.year));
  return parts.length > 0 ? ` (${parts.join(', ')})` : '';
}

const stripTrailingPeriod = (value) => value.replace(/\s*\.\s*$/, '');

/**
 * One reference-list line: "Authors, Title (edition, year). Locator."
 * `locator` is the text an author passed after the `;` in `[@id; locator]` and is
 * optional. The source record's own catalog `locator` is not used here.
 *
 * @param {Record<string, unknown>} record
 * @param {string | undefined} locator
 * @returns {string}
 */
export function formatReferenceText(record, locator) {
  const authors = formatAuthors(record);
  const title =
    typeof record.title === 'string' && record.title.length > 0
      ? record.title
      : String(record.id ?? '');

  const head = [authors, `${title}${formatEditionYear(record)}`]
    .filter(Boolean)
    .join(', ');

  const trimmedLocator = stripTrailingPeriod(String(locator ?? '').trim());
  return trimmedLocator.length > 0
    ? `${stripTrailingPeriod(head)}. ${trimmedLocator}.`
    : `${stripTrailingPeriod(head)}.`;
}

/**
 * The compact "Tuckman & Serrat, Fixed Income Securities (4th ed., 2022)"
 * shown as the panel heading, without the locator.
 *
 * @param {Record<string, unknown>} record
 * @returns {string}
 */
export function formatSourceLabel(record) {
  const authors = formatAuthors(record);
  const title =
    typeof record.title === 'string' && record.title.length > 0
      ? record.title
      : String(record.id ?? '');
  return [authors, `${title}${formatEditionYear(record)}`]
    .filter(Boolean)
    .join(', ');
}
