/**
 * Course configuration (Phase F).
 *
 * Everything specific to *this* course — its identity, its part layout, the
 * domain namespaces its ids use, and the convention keys its consistency checks
 * anchor on. The engine (`src/`) reads this through `contentDir` + a
 * `CourseConfig`-shaped value passed by the wiring layer (`astro.config.mjs`,
 * `scripts/`, `src/content.config.ts`); no engine module imports this file, so a
 * second course is a new `content/` folder plus a new `course.config.ts`.
 *
 * Deliberately zero imports — a plain data module. `CourseConfig` (the shape it
 * must satisfy) is `explico/compiler/course-config` and is applied
 * at each call site.
 */

export const courseConfig = {
  title: 'Credit Products Playground',
  description:
    'Interactive foundations for bonds, credit risk, CDS, CDX, and their options.',

  about: {
    version: '0.4.0',
    authors: [{ name: 'danieltuzes', contact: 'danieltuzes@gmail.com' }],
    disclaimer:
      'Educational material only. No investment, legal, tax, accounting, valuation, risk-management, or trading advice.',
    changelogHref:
      'https://github.com/danieltuzes/credit-and-derivatives/blob/main/content/CHANGELOG.md',
  },

  /**
   * The course's parts (sidebar groups), top to bottom. A lesson slug `bonds/…`
   * joins the `bonds` part; order *within* a part comes from the track order,
   * not here.
   */
  parts: [
    { dir: 'foundations', label: 'Foundations' },
    { dir: 'bonds', label: 'Bonds' },
    { dir: 'rates', label: 'Rates and curves' },
    { dir: 'derivatives', label: 'Derivative foundations' },
    { dir: 'bond-options', label: 'Bond options' },
    { dir: 'credit', label: 'Credit risk' },
    { dir: 'cds', label: 'CDS' },
  ],

  /** Namespaces that appear in competency / notation `domain` fields. */
  domains: [
    'finance',
    'probability',
    'rates',
    'bonds',
    'credit',
    'cds',
    'derivatives',
    'options',
    'bond-options',
  ],

  /**
   * Per-rule settings; only what differs from the engine defaults
   * (`pnpm content rules` prints the rules in effect). USD is on nearly
   * every page as a currency code, so it is common usage rather than an
   * abbreviation to explain (rule N14); the course's own acronyms are in
   * `content/abbreviations/`. `up` and `down` name a lattice state the way
   * the engine's baseline `opt` names an expiry, so they qualify a symbol
   * rather than name a quantity of their own (rule N10).
   */
  rules: {
    N10: { allow: ['up', 'down'] },
    N14: { allow: ['USD'] },
  },

  /**
   * Keys the corpus-consistency checks resolve a stated sign / cash-flow
   * convention against (`convention-single-definition`, D6).
   */
  conventions: {
    signConventionKey: 'signed-cash-flow',
    cashFlowPerspectiveCompetency: 'finance.cash-flow-perspective.apply',
  },
};
