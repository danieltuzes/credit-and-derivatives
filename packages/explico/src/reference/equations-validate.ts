/**
 * Equation-identity validation (Step D7), run inside `compileManifest()`.
 *
 * - `eq-duplicate-key` (Tier 1, error): an `eq:` key is unique per lesson.
 * - `eq-ref-resolves` (Tier 1, error): every `[[eq-key]]` / `[[slug#eq-key]]`
 *   points at a display equation that carries `\label{eq:key}`.
 * - `eq-key-unused` (Tier 3, warning): a labelled equation never referenced.
 *
 * The remark pass enforces the same rules on the render path; this gives the
 * fast `pnpm validate:content` the same coverage and feeds the manifest.
 */

import { parseEquationRef, scanEquationLabels } from './equations.mjs';

export interface EquationLabelRecord {
  readonly key: string;
  readonly number: string;
  readonly lessonId: string;
  readonly slug: string;
  readonly section: number;
  readonly indexInSection: number;
}

export interface EquationRefRecord {
  readonly key: string;
  readonly lessonId: string;
  /** Target lesson slug for a cross-page reference; `undefined` = same page. */
  readonly targetSlug?: string;
}

export type EquationDiagnosticCode =
  'eq-duplicate-key' | 'eq-ref-resolves' | 'eq-key-unused';

export interface EquationDiagnostic {
  readonly code: EquationDiagnosticCode;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly file?: string;
  readonly lessonId?: string;
  readonly key?: string;
}

export interface EquationValidation {
  /** Every labelled equation, sorted by lesson then appearance. */
  readonly labels: readonly EquationLabelRecord[];
  /** `slug -> { eqKey: number }` — the render path's cross-page lookup table. */
  readonly numbersBySlug: Record<string, Record<string, string>>;
  readonly diagnostics: readonly EquationDiagnostic[];
}

export interface EquationLessonInput {
  readonly lessonId: string;
  readonly slug: string;
  readonly file: string;
  readonly body: string;
}

const BRACKET_REF = /\[\[\s*([^\][]+?)\s*\]\]/g;

function stripCode(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/`[^`\n]*`/g, ' ');
}

function bodyEquationRefs(lesson: EquationLessonInput): EquationRefRecord[] {
  const refs: EquationRefRecord[] = [];
  for (const match of stripCode(lesson.body).matchAll(BRACKET_REF)) {
    const parsed = parseEquationRef((match[1] ?? '').trim());
    if (!parsed) continue;
    refs.push({
      key: parsed.key,
      lessonId: lesson.lessonId,
      ...(parsed.lesson ? { targetSlug: parsed.lesson } : {}),
    });
  }
  return refs;
}

export function validateEquations(
  lessons: readonly EquationLessonInput[],
): EquationValidation {
  const labels: EquationLabelRecord[] = [];
  const diagnostics: EquationDiagnostic[] = [];
  const numbersBySlug: Record<string, Record<string, string>> = {};

  for (const lesson of [...lessons].sort((a, b) =>
    a.lessonId.localeCompare(b.lessonId),
  )) {
    const seen = new Set<string>();
    const table: Record<string, string> = {};
    for (const raw of scanEquationLabels(lesson.body) as {
      key: string;
      number: string;
      section: number;
      indexInSection: number;
    }[]) {
      if (seen.has(raw.key)) {
        diagnostics.push({
          code: 'eq-duplicate-key',
          severity: 'error',
          message: `${lesson.lessonId} labels two display equations eq:${raw.key}; an eq: key is unique per lesson`,
          file: lesson.file,
          lessonId: lesson.lessonId,
          key: raw.key,
        });
        continue;
      }
      seen.add(raw.key);
      table[raw.key] = raw.number;
      labels.push({
        key: raw.key,
        number: raw.number,
        lessonId: lesson.lessonId,
        slug: lesson.slug,
        section: raw.section,
        indexInSection: raw.indexInSection,
      });
    }
    numbersBySlug[lesson.slug] = table;
  }

  const referenced = new Set<string>();
  for (const lesson of lessons) {
    const slug = lesson.slug;
    for (const ref of bodyEquationRefs(lesson)) {
      const targetSlug = ref.targetSlug ?? slug;
      const number = numbersBySlug[targetSlug]?.[ref.key];
      referenced.add(`${targetSlug}#${ref.key}`);
      if (number === undefined) {
        diagnostics.push({
          code: 'eq-ref-resolves',
          severity: 'error',
          message: ref.targetSlug
            ? `${lesson.lessonId} references [[${ref.targetSlug}#eq-${ref.key}]] but that lesson has no display equation labelled eq:${ref.key}`
            : `${lesson.lessonId} references [[eq-${ref.key}]] but no display equation on the page carries \\label{eq:${ref.key}}`,
          file: lesson.file,
          lessonId: lesson.lessonId,
          key: ref.key,
        });
      }
    }
  }

  for (const label of labels) {
    if (referenced.has(`${label.slug}#${label.key}`)) continue;
    diagnostics.push({
      code: 'eq-key-unused',
      severity: 'warning',
      message: `${label.lessonId} labels eq:${label.key} (${label.number}) but nothing references it with [[eq-${label.key}]]`,
      file: label.slug,
      lessonId: label.lessonId,
      key: label.key,
    });
  }

  diagnostics.sort(
    (a, b) =>
      a.code.localeCompare(b.code) ||
      (a.lessonId ?? '').localeCompare(b.lessonId ?? '') ||
      (a.key ?? '').localeCompare(b.key ?? '') ||
      a.message.localeCompare(b.message),
  );

  return { labels, numbersBySlug, diagnostics };
}
