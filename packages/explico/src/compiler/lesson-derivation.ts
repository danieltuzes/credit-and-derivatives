/**
 * Pure derivations for facts that used to be authored in lesson frontmatter
 * (Phase C2). Nothing here reads the filesystem; `collections.ts` supplies the
 * inputs and every consumer (the CLI validator, the Astro build, the Starlight
 * layout, the tests) goes through that one loader.
 *
 * Authored per lesson after C2: `title`, `description`, `teaches`, `assumptions`,
 * `editorialStatus`, `notation.local`. Everything below is derived:
 *
 * - `lessonId`      — the doc slug, `/` → `.` (`foundations/discount-factors`).
 * - `requires`      — direct competency-graph prerequisites of `teaches`, minus
 *                     what the lesson teaches itself. `teaches` is kept
 *                     topologically ordered, so the intra-lesson subtraction is
 *                     safe for the `lesson-order` check.
 * - `sources`       — the `[@…]` ids in the body (the validator already
 *                     required frontmatter `sources` to equal this set exactly).
 * - `assessments`   — the id list in the colocated `<lesson>.checks.yml`.
 * - `sidebar` order — per section, lessons in the order the tracks introduce
 *                     them (a stable merge of every track's `lessons`).
 *
 * `notation.uses` is retired (D3): the completeness gate compiles every
 * lesson's math against the page glyph table — `notation.local` plus the
 * shared keys the body names with `[[key]]` / `\explain` — so an import list
 * is redundant.
 */

/** `foundations/discount-factors` → `foundations.discount-factors`. */
export function lessonIdFromSlug(slug: string): string {
  return slug.replace(/\.(md|mdx)$/, '').replace(/\//g, '.');
}

/**
 * A docs entry is a lesson when it lives in a section directory. The three
 * top-level pages (`index`, `curriculum-map`, `glossary`) are not lessons; a
 * future `<section>/index` page would not be one either.
 */
export function isLessonSlug(slug: string): boolean {
  const clean = slug.replace(/\.(md|mdx)$/, '');
  return clean.includes('/') && !clean.endsWith('/index');
}

/**
 * Direct prerequisites of everything the lesson `teaches`, minus the taught
 * competencies themselves, sorted. Editorial "you should also know" extras that
 * a few lessons used to list by hand are intentionally not reconstructed — a
 * real dependency belongs in the competency graph, not per lesson.
 */
export function deriveRequires(
  teaches: readonly string[],
  prerequisitesById: ReadonlyMap<string, readonly string[]>,
): string[] {
  const taught = new Set(teaches);
  const required = new Set<string>();
  for (const competencyId of teaches) {
    for (const prerequisiteId of prerequisitesById.get(competencyId) ?? []) {
      if (!taught.has(prerequisiteId)) required.add(prerequisiteId);
    }
  }
  return [...required].sort();
}

/**
 * Source ids cited with `[@id]` (optionally `[@id; locator]`) in a lesson body,
 * with fenced and inline code stripped first so a syntax example does not
 * count. Mirrors the reader in `curriculum/validation.ts`.
 */
export function citedSourceIds(body: string): Set<string> {
  const withoutCode = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '');
  const ids = new Set<string>();
  for (const match of withoutCode.matchAll(
    /\[@([a-z0-9][a-z0-9.-]*)(?:;[^\]]*)?\]/g,
  )) {
    ids.add((match[1] ?? '').trim());
  }
  return ids;
}

/** Cited source ids as a sorted array — the derived frontmatter `sources`. */
export function deriveSources(body: string): string[] {
  return [...citedSourceIds(body)].sort();
}

/**
 * Parse a colocated `<lesson>.checks.yml`. The file is a flat YAML list of
 * assessment ids (`- discount-factor-check`); `[]` and an empty file mean no
 * assessments. Deliberately tiny — a colocated check *spec* with inline items
 * is a later step; C2 only relocates the id list.
 */
export function parseCheckList(text: string): string[] {
  const ids: string[] = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (line === '' || line === '[]') continue;
    const match = line.match(/^-\s+(['"]?)([A-Za-z0-9][A-Za-z0-9._-]*)\1$/);
    if (!match) {
      throw new Error(
        `checks.yml: expected "- <assessment-id>" lines, got ${JSON.stringify(rawLine)}`,
      );
    }
    ids.push(match[2]);
  }
  return ids;
}

interface TrackLike {
  readonly id: string;
  readonly lessons: readonly string[];
}

/**
 * One global lesson order from every track: start with the tracks sorted by id,
 * then splice each later track's new lessons in right after the last lesson from
 * that track already placed. Lessons shared between tracks keep their first
 * track's position; a lesson in no track is absent (callers append leftovers).
 */
export function mergeTrackOrder(tracks: readonly TrackLike[]): string[] {
  const ordered: string[] = [];
  for (const track of [...tracks].sort((a, b) => a.id.localeCompare(b.id))) {
    let anchor = -1;
    for (const lessonId of track.lessons) {
      const at = ordered.indexOf(lessonId);
      if (at !== -1) {
        anchor = at;
        continue;
      }
      ordered.splice(anchor + 1, 0, lessonId);
      anchor += 1;
    }
  }
  return ordered;
}

/** One sidebar section group. Data lives in `content/course.config.ts` (Phase F). */
export interface SidebarSection {
  readonly dir: string;
  readonly label: string;
}

export type SidebarGroup =
  | { readonly label: string; readonly items: readonly string[] }
  | {
      readonly label: string;
      readonly items: readonly {
        readonly label: string;
        readonly link: string;
      }[];
    };

/**
 * The Starlight `sidebar` config: one group per section, lessons ordered by the
 * merged track order (ties broken by slug), then the static Reference group.
 * Replaces seven `autogenerate` blocks that read an authored `sidebar.order`.
 */
export function buildSidebar(
  tracks: readonly TrackLike[],
  lessonSlugs: readonly string[],
  sections: readonly SidebarSection[],
): SidebarGroup[] {
  const rank = new Map(
    mergeTrackOrder(tracks).map((lessonId, index) => [lessonId, index]),
  );
  const positionOf = (slug: string) =>
    rank.get(lessonIdFromSlug(slug)) ?? Number.POSITIVE_INFINITY;

  const groups: SidebarGroup[] = sections.map(({ dir, label }) => ({
    label,
    items: lessonSlugs
      .filter((slug) => slug.startsWith(`${dir}/`))
      .sort(
        (left, right) =>
          positionOf(left) - positionOf(right) || left.localeCompare(right),
      ),
  }));

  groups.push({
    label: 'Reference',
    items: [
      { label: 'Curriculum map', link: '/curriculum-map/' },
      { label: 'Notation glossary', link: '/glossary/' },
    ],
  });

  return groups;
}
