/**
 * Corpus consistency checks (Step D6) — the Tier 1–2 checks from the cleanup
 * plan's "Enforced checks" section that no earlier step covers.
 *
 * Every check here enters as a **Tier-3 warning**: `pnpm validate:content`
 * surfaces the counts, `manifest.diagnostics.consistency` records the detail,
 * and `resolution/consistency-report.json` is the committed, diff-checkable
 * snapshot. Nothing here changes content — each finding is an open item for a
 * separate human-quantitative-reviewed pass. A finding is silenced only by a
 * reviewed line in `lint-ignore.yml` (see `./lint-ignore`).
 *
 *   (a) glyph-unique-in-corpus       one rendered glyph → one meaning corpus-wide
 *   (b) notation-units / units-vocab  every entry has units or `dimensionless`,
 *                                     unit strings drawn from a controlled vocab
 *   (c) convention-single-definition  a sign / cash-flow-perspective convention a
 *                                     lesson uses resolves to one declaration
 *   (e) numerals-tagged              numerals in `$…$` / result tables are tagged
 *                                     to a `src/domain/` call or a source locator
 *   (f) weak-local                   a `notation.local` symbol used only in its
 *                                     own defining equation and prose
 *   (g) notation-source-locator      every notation `sources` entry has a locator
 *
 * Check (d) — the committed per-lesson resolution report — lives in
 * `src/content/resolution-report.ts`.
 */

import type { CurriculumCatalog } from '../curriculum/validation';
import type { NotationSpec } from '../content/collections';
import type { LintIgnore } from './lint-ignore';
import { offVocabularyTokens } from './units-vocab';
import type {
  NotationDefinitionRecord,
  NotationRegistry,
  NotationRegistryInput,
} from './types';

export type ConsistencyCode =
  | 'glyph-unique-in-corpus'
  | 'notation-units'
  | 'units-vocab'
  | 'convention-single-definition'
  | 'numerals-tagged'
  | 'weak-local'
  | 'notation-source-locator';

export interface ConsistencyDiagnostic {
  readonly code: ConsistencyCode;
  /** Tier 3 — every finding here is a warning until content is brought clean. */
  readonly severity: 'warning';
  readonly message: string;
  readonly file?: string;
  readonly lessonId?: string;
  readonly key?: string;
  readonly glyph?: string;
  /** For the aggregate numeral check. */
  readonly count?: number;
}

export interface ConsistencyInput {
  readonly registry: NotationRegistry;
  readonly notationInput: NotationRegistryInput;
  readonly specs: readonly NotationSpec[];
  readonly catalog: CurriculumCatalog;
  readonly lintIgnore: LintIgnore;
}

const CASH_FLOW_PERSPECTIVE_COMPETENCY = 'finance.cash-flow-perspective.apply';
const SIGN_CONVENTION_KEY = 'signed-cash-flow';

const CONVENTION_RE =
  /\bsign convention\b|\bcash-flow perspective\b|\bholder(?:'s)?(?:\s+\w+){0,2}\s+perspective\b|\bfrom (?:a|one|the|its)(?:\s+\w+){0,3}\s+perspective\b|\breverses? every sign\b|\bpositive (?:means|amounts?)\b/i;

// --- shared text helpers ------------------------------------------------

function stripCode(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^`])`[^`\n]*`/g, (match) => match.replace(/[^\n]/g, ' '));
}

interface MathSpan {
  readonly latex: string;
}

function mathSpans(body: string): MathSpan[] {
  const searchable = stripCode(body);
  const spans: MathSpan[] = [];
  for (const match of searchable.matchAll(/\$\$([\s\S]+?)\$\$/g)) {
    spans.push({ latex: match[1] ?? '' });
  }
  for (const match of searchable
    .replace(/\$\$([\s\S]+?)\$\$/g, (block) => block.replace(/[^\n]/g, ' '))
    .matchAll(/(?<![\\$])\$(?!\s)([^$\n]+?)(?<![\\\s])\$(?!\d)/g)) {
    spans.push({ latex: match[1] ?? '' });
  }
  return spans;
}

function tableRows(body: string): string[] {
  const rows: string[] = [];
  for (const line of stripCode(body).split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.slice(1).includes('|')) continue;
    if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) continue;
    rows.push(line);
  }
  return rows;
}

const NUMERAL_RE = /(?<![\w.])-?\d+(?:\.\d+)?/g;

function numeralCount(text: string): number {
  return (text.replace(/\\[a-zA-Z]+/g, ' ').match(NUMERAL_RE) ?? []).length;
}

/** A math span / table row is "tagged" when it carries a citation or a domain marker. */
function isTagged(text: string): boolean {
  return /\[@[a-z0-9]/i.test(text) || /<!--\s*domain:/i.test(text);
}

// --- glyph regex for weak-local --------------------------------------

function glyphMatcher(latex: string): RegExp | undefined {
  const trimmed = latex.trim();
  if (trimmed === '') return undefined;
  if (/^[A-Za-z]$/.test(trimmed)) {
    return new RegExp(`(?<![A-Za-z\\\\])${trimmed}(?![A-Za-z])`);
  }
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    /[A-Za-z]$/.test(trimmed) ? `${escaped}(?![A-Za-z])` : escaped,
  );
}

// --- checks ----------------------------------------------------------

function checkGlyphUniqueness(
  input: ConsistencyInput,
  out: ConsistencyDiagnostic[],
): void {
  const byId = new Map<string, NotationDefinitionRecord>(
    input.registry.definitions.map((definition) => [definition.id, definition]),
  );
  // glyph -> key -> lessons that bind it
  const glyphs = new Map<string, Map<string, Set<string>>>();
  const record = (glyph: string, key: string, lessonId: string): void => {
    const trimmed = glyph.trim();
    if (trimmed === '') return;
    const keys = glyphs.get(trimmed) ?? new Map<string, Set<string>>();
    const lessons = keys.get(key) ?? new Set<string>();
    lessons.add(lessonId);
    keys.set(key, lessons);
    glyphs.set(trimmed, keys);
  };

  for (const definition of input.registry.definitions) {
    if (definition.kind === 'local') {
      record(definition.notation, definition.key, definition.lessonId);
    }
  }
  for (const bundle of input.registry.bundles) {
    for (const binding of bundle.bindings) {
      const definition = byId.get(binding.definitionId);
      if (definition) record(definition.notation, binding.key, bundle.lessonId);
    }
  }

  for (const [glyph, keys] of [...glyphs].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (keys.size < 2) continue;
    if (input.lintIgnore.matches('glyph-unique-in-corpus', glyph)) continue;
    const detail = [...keys]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, lessons]) => `${key} (${[...lessons].sort().join(', ')})`)
      .join('; ');
    out.push({
      code: 'glyph-unique-in-corpus',
      severity: 'warning',
      glyph,
      message: `glyph ${JSON.stringify(glyph)} resolves to ${keys.size} meanings across the corpus: ${detail}`,
    });
  }
}

function checkNotationUnits(
  input: ConsistencyInput,
  out: ConsistencyDiagnostic[],
): void {
  for (const spec of input.specs) {
    if (spec.units === undefined && !spec.dimensionless) {
      if (input.lintIgnore.matches('notation-units', spec.key)) continue;
      out.push({
        code: 'notation-units',
        severity: 'warning',
        key: spec.key,
        file: spec.file,
        ...(spec.lessonId ? { lessonId: spec.lessonId } : {}),
        message: `notation ${spec.key} (${spec.scope}) declares neither units nor dimensionless`,
      });
      continue;
    }
    if (spec.units === undefined) continue;
    const offVocab = offVocabularyTokens(spec.units);
    if (offVocab.length === 0) continue;
    if (input.lintIgnore.matches('units-vocab', spec.key)) continue;
    out.push({
      code: 'units-vocab',
      severity: 'warning',
      key: spec.key,
      file: spec.file,
      ...(spec.lessonId ? { lessonId: spec.lessonId } : {}),
      message: `notation ${spec.key} units ${JSON.stringify(spec.units)} use non-vocabulary token(s): ${offVocab.join(', ')}`,
    });
  }
}

function checkConventionSingleDefinition(
  input: ConsistencyInput,
  out: ConsistencyDiagnostic[],
): void {
  const lessonById = new Map(
    input.catalog.lessons.map((lesson) => [lesson.id, lesson]),
  );
  for (const lesson of input.notationInput.lessons) {
    const body = lesson.body;
    if (!CONVENTION_RE.test(body)) continue;
    const meta = lessonById.get(lesson.lessonId);
    const anchoredByCompetency = [
      ...(meta?.teaches ?? []),
      ...(meta?.requires ?? []),
    ].includes(CASH_FLOW_PERSPECTIVE_COMPETENCY);
    const anchoredByTerm = new RegExp(
      `\\[\\[\\s*${SIGN_CONVENTION_KEY}\\s*\\]\\]`,
    ).test(body);
    if (anchoredByCompetency || anchoredByTerm) continue;
    if (
      input.lintIgnore.matches('convention-single-definition', lesson.lessonId)
    ) {
      continue;
    }
    out.push({
      code: 'convention-single-definition',
      severity: 'warning',
      lessonId: lesson.lessonId,
      file: lesson.source.file,
      message: `${lesson.lessonId} states a sign / cash-flow-perspective convention in prose but does not resolve it to a single declaration ([[${SIGN_CONVENTION_KEY}]] or ${CASH_FLOW_PERSPECTIVE_COMPETENCY})`,
    });
  }
}

function checkNumeralsTagged(
  input: ConsistencyInput,
  out: ConsistencyDiagnostic[],
): void {
  for (const lesson of input.notationInput.lessons) {
    if (input.lintIgnore.matches('numerals-tagged', lesson.lessonId)) continue;
    let math = 0;
    for (const span of mathSpans(lesson.body)) {
      if (isTagged(span.latex)) continue;
      math += numeralCount(span.latex);
    }
    let table = 0;
    for (const row of tableRows(lesson.body)) {
      if (isTagged(row)) continue;
      table += numeralCount(row.replace(/\$[^$\n]*\$/g, ' '));
    }
    const count = math + table;
    if (count === 0) continue;
    out.push({
      code: 'numerals-tagged',
      severity: 'warning',
      lessonId: lesson.lessonId,
      file: lesson.source.file,
      count,
      message: `${lesson.lessonId}: ${count} numeral(s) in $…$ / result tables (${math} in math, ${table} in tables) are not tagged to a src/domain/ call or a source locator`,
    });
  }
}

function checkWeakLocal(
  input: ConsistencyInput,
  out: ConsistencyDiagnostic[],
): void {
  for (const lesson of input.notationInput.lessons) {
    const spans = mathSpans(lesson.body).map((span) => span.latex);
    for (const definition of lesson.localDefinitions) {
      if (input.lintIgnore.matches('weak-local', definition.key)) continue;
      const matcher = glyphMatcher(definition.notation);
      if (!matcher) continue;
      const uses = spans.filter((latex) => matcher.test(latex)).length;
      if (uses > 1) continue;
      out.push({
        code: 'weak-local',
        severity: 'warning',
        lessonId: lesson.lessonId,
        file: lesson.source.file,
        key: definition.key,
        count: uses,
        message: `${lesson.lessonId}: local symbol ${definition.key} (${definition.notation}) appears in ${uses} body equation(s); referenced only in its defining equation and prose — inline candidate`,
      });
    }
  }
}

function checkNotationSourceLocator(
  input: ConsistencyInput,
  out: ConsistencyDiagnostic[],
): void {
  for (const spec of input.specs) {
    for (const [index, source] of spec.sources.entries()) {
      if (source.hasLocator) continue;
      if (input.lintIgnore.matches('notation-source-locator', spec.key)) break;
      out.push({
        code: 'notation-source-locator',
        severity: 'warning',
        key: spec.key,
        file: spec.file,
        ...(spec.lessonId ? { lessonId: spec.lessonId } : {}),
        message: `notation ${spec.key} sources[${index}] (${source.id || 'bare id'}) has no non-empty locator`,
      });
    }
  }
}

const CHECKS: ((
  input: ConsistencyInput,
  out: ConsistencyDiagnostic[],
) => void)[] = [
  checkGlyphUniqueness,
  checkNotationUnits,
  checkConventionSingleDefinition,
  checkNumeralsTagged,
  checkWeakLocal,
  checkNotationSourceLocator,
];

/**
 * Run every consistency check. The result is sorted deterministically (code,
 * then lesson / key / glyph, then message) so it is byte-stable in the manifest
 * and the committed report.
 */
export function runConsistencyChecks(
  input: ConsistencyInput,
): ConsistencyDiagnostic[] {
  const diagnostics: ConsistencyDiagnostic[] = [];
  for (const check of CHECKS) check(input, diagnostics);
  return diagnostics.sort(
    (left, right) =>
      left.code.localeCompare(right.code) ||
      (left.lessonId ?? '').localeCompare(right.lessonId ?? '') ||
      (left.key ?? '').localeCompare(right.key ?? '') ||
      (left.glyph ?? '').localeCompare(right.glyph ?? '') ||
      left.message.localeCompare(right.message),
  );
}

/** `{ code: count }` for the CLI summary and the report header. */
export function consistencyCounts(
  diagnostics: readonly ConsistencyDiagnostic[],
): Record<ConsistencyCode, number> {
  const counts = {
    'glyph-unique-in-corpus': 0,
    'notation-units': 0,
    'units-vocab': 0,
    'convention-single-definition': 0,
    'numerals-tagged': 0,
    'weak-local': 0,
    'notation-source-locator': 0,
  } satisfies Record<ConsistencyCode, number>;
  for (const diagnostic of diagnostics) counts[diagnostic.code] += 1;
  return counts;
}
