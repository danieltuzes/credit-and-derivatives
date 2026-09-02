/**
 * The base notation library: a small, fixed set of universal identifier atoms
 * that the page-level glyph map never asks an author to declare.
 *
 * Rationale (cleanup plan, "Decide once"): keep a base library so the
 * completeness gate does not choke on mathematical constants and the
 * differential operator. It is deliberately tiny and greppable — anything a
 * lesson uses with a domain meaning (rates, indices, prices) still resolves to
 * a semantic key or fails at `file:line:token`.
 *
 * Function names (`\ln`, `\exp`, `\log`, `\sin`, `\max`, `\sum`, `\prod`, …)
 * are not listed here: KaTeX parses them as operator nodes, not identifier
 * atoms, so the tokenizer never treats them as bindable symbols.
 */
export const BASE_LIBRARY = Object.freeze(
  new Set([
    'd', // differential operator: dt, dx
    'e', // Euler's number
    'i', // imaginary unit
    '\\pi',
  ]),
);

/** True when `token` is a base-library atom and needs no semantic key. */
export function isBaseLibraryAtom(token) {
  return BASE_LIBRARY.has(token);
}
