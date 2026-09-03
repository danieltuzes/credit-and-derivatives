/**
 * Course configuration (Phase F).
 *
 * Everything specific to *this* course — its identity, its section layout, the
 * domain namespaces its ids use, and the convention keys its consistency checks
 * anchor on. The engine (`src/`) reads this through `contentDir` + a
 * `CourseConfig`-shaped value passed by the wiring layer (`astro.config.mjs`,
 * `scripts/`, `src/content.config.ts`); no engine module imports this file, so a
 * second course is a new `content/` folder plus a new `course.config.ts`.
 *
 * Deliberately zero imports — a plain data module. `CourseConfig` (the shape it
 * must satisfy) lives in `src/compiler/course-config.ts` and is applied at each
 * call site.
 */

export const courseConfig = {
  title: 'Credit Products Playground',
  description:
    'Interactive foundations for bonds, credit risk, CDS, CDX, and their options.',

  /**
   * Sidebar section groups, top to bottom. A lesson slug `bonds/…` joins the
   * `bonds` group; order *within* a group comes from the track order, not here.
   */
  sections: [
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
   * Keys the corpus-consistency checks resolve a stated sign / cash-flow
   * convention against (`convention-single-definition`, D6).
   */
  conventions: {
    signConventionKey: 'signed-cash-flow',
    cashFlowPerspectiveCompetency: 'finance.cash-flow-perspective.apply',
  },
};
