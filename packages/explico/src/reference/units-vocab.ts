/**
 * Controlled vocabulary for notation `units` strings (Step D6, check `units-vocab`).
 *
 * A `units` string is a short English phrase (`stated currency at valuation
 * time`, `model-years from valuation time`, `probability between zero and one`).
 * There is no fixed enum of whole phrases — the corpus composes them — so the
 * vocabulary is a **word list**: every whitespace/hyphen-separated token of a
 * `units` string must already be established in the corpus.
 *
 * The list below is the set of tokens that appear in two or more distinct
 * `units` strings today, plus a small set of function words and morphological
 * variants. A token outside it is either a typo or unreviewed divergence
 * (`USD` vs `stated currency`, `valuation date` vs `valuation time`,
 * `synthetic` / `simplified` framing, multi-clause `code; … prose and UI`
 * strings) — surfaced as a Tier-3 warning, never auto-corrected.
 *
 * Extend deliberately: add a token here only when a reviewer has accepted the
 * phrasing that introduces it.
 */

export const UNITS_VOCAB: ReadonlySet<string> = new Set([
  // structure / function words
  'a',
  'and',
  'as',
  'at',
  'between',
  'by',
  'for',
  'from',
  'in',
  'of',
  'or',
  'per',
  'the',
  'this',
  'to',
  'under',
  'when',
  'after',
  // currency / value
  'currency',
  'currencies',
  'currency-unit',
  'currency-units',
  'unit',
  'units',
  'stated',
  'value',
  'present',
  'notional',
  'cash',
  // time
  'time',
  'times',
  'year',
  'years',
  'model',
  'model-year',
  'model-years',
  'valuation',
  'date',
  'dates',
  'day',
  'days',
  'horizon',
  'current',
  'future',
  'next',
  'node',
  'successor',
  'settlement',
  'expiry',
  'expiration',
  'delivery',
  'forward',
  'maturity',
  'payment',
  'payments',
  'coupon',
  'premium',
  'accrual',
  'scheduled',
  'schedule',
  'period',
  'periods',
  // rates / dimensionless
  'decimal',
  'rate',
  'nominal',
  'annual',
  'compounded',
  'compounding',
  'frequency',
  'intensity',
  'basis',
  'point',
  'points',
  'percent',
  'fraction',
  'probability',
  'probabilities',
  'weight',
  'weights',
  'dimensionless',
  'integer',
  'index',
  'count',
  'zero',
  'one',
  // instruments / quantities
  'bond',
  'option',
  'claim',
  'security',
  'underlying',
  'quantity',
  'quoted',
  'explicitly',
  'calculations',
]);

/** Lowercase word tokens of a `units` string (split on whitespace and hyphens). */
export function unitsTokens(units: string): string[] {
  return units
    .toLowerCase()
    .split(/[\s]+/)
    .flatMap((word) => word.split(/(?<=[a-z0-9])-(?=[a-z])/))
    .map((word) => word.replace(/^[^a-z0-9_]+|[^a-z0-9_]+$/g, ''))
    .filter((word) => word.length > 0 && !/^\d+$/.test(word));
}

/** Tokens of `units` that are not in the controlled vocabulary, in order, deduped. */
export function offVocabularyTokens(units: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of unitsTokens(units)) {
    if (UNITS_VOCAB.has(token) || seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}
