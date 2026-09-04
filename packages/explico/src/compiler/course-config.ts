/**
 * The shape `content/course.config.ts` must satisfy (Phase F).
 *
 * The engine never imports the course's config file; the wiring layer
 * (`astro.config.mjs`, `scripts/*`, `src/content.config.ts`) imports the plain
 * data value and passes it here, typed against `CourseConfig`. A second course
 * supplies its own value of this shape.
 */

export interface CourseSection {
  /** Lesson-slug prefix, e.g. `bonds` for `bonds/yield-to-maturity`. */
  readonly dir: string;
  /** Sidebar group heading. */
  readonly label: string;
}

export interface CourseConventions {
  /** Notation key a lesson's stated sign convention must resolve to. */
  readonly signConventionKey: string;
  /** Competency id that also counts as declaring the cash-flow perspective. */
  readonly cashFlowPerspectiveCompetency: string;
}

export interface CourseConfig {
  readonly title: string;
  readonly description: string;
  /** Sidebar section groups, in order. */
  readonly sections: readonly CourseSection[];
  /** Namespaces used by competency / notation `domain` fields. */
  readonly domains: readonly string[];
  readonly conventions: CourseConventions;
}
