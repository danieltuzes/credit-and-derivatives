/**
 * The single path from content files to typed data.
 *
 * Every consumer — the `validate:content` CLI, the Astro build (`astro.config.mjs`),
 * the Starlight footer, the lab math scope, and the tests — reads content through
 * this module. It walks `src/content/` once and parses frontmatter with Astro's
 * own `parseFrontmatter` (the same parser the content collections use), so there
 * is no second Markdown/YAML reader and `gray-matter` is no longer a dependency.
 *
 * Replaces `scripts/curriculum-files.ts`, `scripts/notation-files.ts`, and the
 * inline `readdirSync`/`gray-matter` notation + source loads in `astro.config.mjs`.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { parseFrontmatter } from '@astrojs/markdown-remark';

import type {
  AssessmentDefinition,
  CompetencyDefinition,
  CurriculumCatalog,
  LessonDefinition,
  SourceDefinition,
  TrackDefinition,
} from '../curriculum/validation';
import type {
  EditorialStatus,
  LocalNotationDefinitionInput,
  NotationAlignment,
  NotationLessonInput,
  NotationReferenceInput,
  NotationRegistryInput,
  SharedNotationDefinitionInput,
  SourceSpan,
} from '../reference/types';
import { isSubstantiveMeaning } from '../reference/prose';
import { parseEquationRef } from '../reference/equations.mjs';
import { resolveLabel } from '../reference/label';
import {
  deriveRequires,
  deriveSources,
  isLessonSlug,
  lessonIdFromSlug,
  parseCheckList,
} from './lesson-derivation';

// Every invocation — the CLI, `astro build`/`check`, and vitest — runs with the
// repository root as the working directory. Content is the top-level `content/`
// folder (Phase F); the engine names only this convention, never a course path.
const REPOSITORY_ROOT = process.cwd();
const CONTENT_ROOT = join(REPOSITORY_ROOT, 'content');

/** Every file with one of the given extensions below `directory`, sorted. */
function filesBelow(
  directory: string,
  extensions: readonly string[],
): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  return entries
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return filesBelow(path, extensions);
      return entry.isFile() &&
        extensions.some((extension) => entry.name.endsWith(extension))
        ? [path]
        : [];
    })
    .sort();
}

interface ParsedDocument {
  /** Path relative to the repository root, e.g. `src/content/docs/foo.md`. */
  readonly file: string;
  readonly data: Record<string, unknown>;
  /** Markdown body, byte-identical to the previous `gray-matter` output. */
  readonly body: string;
}

/**
 * Astro's `parseFrontmatter` prepends one newline to the body that `gray-matter`
 * did not; strip it so body offsets in diagnostics are unchanged.
 */
function parseDocument(path: string): ParsedDocument {
  const parsed = parseFrontmatter(readFileSync(path, 'utf8'));
  return {
    file: relative(REPOSITORY_ROOT, path),
    data: (parsed.frontmatter ?? {}) as Record<string, unknown>,
    body: parsed.content.replace(/^\n/, ''),
  };
}

// --- shared value coercions (ported from the deleted loaders) --------------

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

function optionalString(value: unknown, label: string): string | undefined {
  return value === undefined ? undefined : string(value, label);
}

/** A notation `meaning`: a non-empty string that clears the C1b safeguard. */
function meaningText(value: unknown, label: string): string {
  const text = string(value, label);
  if (!isSubstantiveMeaning(text)) {
    throw new TypeError(
      `${label} must be substantive prose (at least four words, not a placeholder)`,
    );
  }
  return text;
}

function strings(value: unknown, label: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new TypeError(`${label} must be an array of strings`);
  }
  return [...value] as string[];
}

/**
 * Notation `sources`: a bare id (legacy) or `{id, locator}` (Phase C1b). The
 * locator is not yet carried into the registry input — see D6/D13.
 */
function sourceIds(value: unknown, label: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new TypeError(`${label} must be an array`);
  }
  return value.map((item, index) => {
    if (typeof item === 'string') return item;
    if (item !== null && typeof item === 'object' && 'id' in item) {
      return string((item as { id: unknown }).id, `${label}[${index}].id`);
    }
    throw new TypeError(`${label}[${index}] must be an id or { id, locator }`);
  });
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${label} must be a boolean`);
  }
  return value;
}

function status(value: unknown, label: string): EditorialStatus {
  if (value !== 'draft' && value !== 'in-review' && value !== 'reviewed') {
    throw new TypeError(`${label} must be draft, in-review, or reviewed`);
  }
  return value;
}

function alignment(value: unknown, label: string): NotationAlignment {
  const data = record(value, label);
  if (data.kind === 'general') {
    return {
      kind: 'general',
      rationale: string(data.rationale, `${label}.rationale`),
    };
  }
  if (data.kind === 'competency') {
    return {
      kind: 'competency',
      introducedByCompetency: string(
        data.introducedByCompetency,
        `${label}.introducedByCompetency`,
      ),
      introducedInLesson: string(
        data.introducedInLesson,
        `${label}.introducedInLesson`,
      ),
    };
  }
  throw new TypeError(`${label}.kind must be competency or general`);
}

// --- notation reference extraction ----------------------------------------

function sourceSpan(file: string, text?: string, index?: number): SourceSpan {
  if (text === undefined || index === undefined) return { file };
  const before = text.slice(0, index);
  const lines = before.split('\n');
  return {
    file,
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
  };
}

function maskMarkdownLiterals(text: string): string {
  const mask = (value: string) => value.replace(/[^\n]/g, ' ');
  return text
    .replace(
      /(^|\n)[ \t]{0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n[ \t]{0,3}\2[^\n]*(?=\n|$)|$)/g,
      mask,
    )
    .replace(/^(?: {4}|\t).*$/gm, mask)
    .replace(/(`+)(?!`)([^\n]*?)\1/g, mask);
}

/**
 * Notation references (`[[key]]` in prose, `\explain{key}` in math) in a body,
 * ignoring code fences and inline code, sorted by position.
 */
export function extractNotationReferences(
  text: string,
  file: string,
  kind: NotationReferenceInput['kind'] | undefined,
): NotationReferenceInput[] {
  const references: NotationReferenceInput[] = [];
  const searchable = maskMarkdownLiterals(text);
  const patterns: readonly [RegExp, NotationReferenceInput['kind']][] = [
    [/\[\[\s*([^\][]+?)\s*\]\]/g, kind ?? 'prose'],
    [/\\explain\{([^{}]+)\}/g, kind ?? 'math'],
  ];

  for (const [pattern, referenceKind] of patterns) {
    for (const match of searchable.matchAll(pattern)) {
      const key = (match[1] ?? '').trim();
      // `[[eq:key]]` / `[[slug#eq:key]]` are equation references (D7), resolved
      // by the remark pass and the manifest, not notation keys.
      if (parseEquationRef(key)) continue;
      references.push({
        key,
        kind: referenceKind,
        source: sourceSpan(file, text, match.index),
      });
    }
  }

  return references.sort(
    (left, right) =>
      (left.source.line ?? 0) - (right.source.line ?? 0) ||
      (left.source.column ?? 0) - (right.source.column ?? 0) ||
      left.key.localeCompare(right.key),
  );
}

// --- curriculum catalog --------------------------------------------------

function jsonEntries<T extends { readonly id: string }>(
  directory: string,
): T[] {
  return filesBelow(directory, ['.json']).map((path) => {
    const entry = JSON.parse(readFileSync(path, 'utf8')) as T;
    const filenameId = basename(path, '.json');
    if (entry.id !== filenameId) {
      throw new Error(
        `${relative(REPOSITORY_ROOT, path)} declares id ${entry.id}; expected filename ${filenameId}.json`,
      );
    }
    return entry;
  });
}

/** Path relative to `src/content/docs`, POSIX-separated, e.g. `bonds/yield.mdx`. */
function docSlug(path: string): string {
  return relative(join(CONTENT_ROOT, 'docs'), path).replace(/\\/g, '/');
}

/** Assessment ids from a lesson's colocated `<name>.checks.yml`, or `[]`. */
function lessonCheckIds(lessonPath: string): string[] {
  const checksPath = lessonPath.replace(/\.mdx?$/, '.checks.yml');
  return existsSync(checksPath)
    ? parseCheckList(readFileSync(checksPath, 'utf8'))
    : [];
}

function lessonEntries(
  prerequisitesById: ReadonlyMap<string, readonly string[]>,
): LessonDefinition[] {
  const lessons: LessonDefinition[] = [];
  for (const path of filesBelow(join(CONTENT_ROOT, 'docs'), ['.md', '.mdx'])) {
    const slug = docSlug(path);
    if (!isLessonSlug(slug)) continue;
    const { data, body } = parseDocument(path);
    const teaches = (data.teaches as string[] | undefined) ?? [];
    lessons.push({
      id: lessonIdFromSlug(slug),
      status: (data.editorialStatus as LessonDefinition['status']) ?? 'draft',
      requires: deriveRequires(teaches, prerequisitesById),
      teaches,
      assessments: lessonCheckIds(path),
      sources: deriveSources(body),
      assumptions: (data.assumptions as string[] | undefined) ?? [],
      body,
    });
  }
  return lessons;
}

export async function loadCurriculumCatalog(): Promise<CurriculumCatalog> {
  const competencies = jsonEntries<CompetencyDefinition>(
    join(CONTENT_ROOT, 'competencies'),
  );
  const prerequisitesById = new Map(
    competencies.map((competency) => [
      competency.id,
      competency.prerequisites ?? [],
    ]),
  );
  return {
    competencies,
    lessons: lessonEntries(prerequisitesById),
    assessments: jsonEntries<AssessmentDefinition>(
      join(CONTENT_ROOT, 'assessments'),
    ),
    sources: jsonEntries<SourceDefinition>(join(CONTENT_ROOT, 'sources')),
    tracks: jsonEntries<TrackDefinition>(join(CONTENT_ROOT, 'tracks')),
  };
}

// --- notation registry input -------------------------------------------

function localDefinition(
  raw: unknown,
  file: string,
  index: number,
): LocalNotationDefinitionInput {
  const at = `${file} notation.local[${index}]`;
  const data = record(raw, at);
  const key = string(data.key, `${at}.key`);
  const latex = string(data.latex, `${at}.latex`);
  const meaning = meaningText(data.meaning, `${at}.meaning`);
  const formula = optionalString(data.formula, `${at}.formula`);
  const units = optionalString(data.units, `${at}.units`);
  const definitionText = [meaning, formula]
    .filter((value): value is string => value !== undefined)
    .join('\n');

  return {
    key,
    notation: latex,
    label: resolveLabel(key, optionalString(data.label, `${at}.label`)),
    summary: meaning,
    sources: sourceIds(data.sources, `${at}.sources`),
    seeAlso: strings(data.seeAlso, `${at}.seeAlso`),
    alignment:
      data.alignment === undefined
        ? { kind: 'general', rationale: 'Lesson-local symbol.' }
        : alignment(data.alignment, `${at}.alignment`),
    references: extractNotationReferences(definitionText, file, 'definition'),
    source: { file },
    ...(formula === undefined ? {} : { formula }),
    ...(units === undefined ? {} : { units }),
  };
}

function sharedNotationEntries(): SharedNotationDefinitionInput[] {
  const directory = join(CONTENT_ROOT, 'notation');
  return filesBelow(directory, ['.md']).map((path) => {
    const { file, data, body } = parseDocument(path);
    const key = string(data.key, `${file} key`);
    const filenameKey = basename(path, '.md');
    if (key !== filenameKey) {
      throw new Error(`${file} declares key ${key}; expected ${filenameKey}`);
    }
    const units = optionalString(data.units, `${file} units`);
    const formula = optionalString(data.formula, `${file} formula`);
    const meaning = meaningText(data.meaning, `${file} meaning`);
    return {
      key,
      notation: string(data.latex, `${file} latex`),
      label: resolveLabel(key, optionalString(data.label, `${file} label`)),
      summary: meaning,
      aliases: strings(data.aliases, `${file} aliases`),
      domain: string(data.domain, `${file} domain`),
      sources: sourceIds(data.sources, `${file} sources`),
      seeAlso: strings(data.seeAlso, `${file} seeAlso`),
      alignment: alignment(data.alignment, `${file} alignment`),
      status: status(data.editorialStatus, `${file} editorialStatus`),
      aiAssisted: boolean(data.aiAssisted, `${file} aiAssisted`),
      body,
      references: extractNotationReferences(body, file, undefined),
      source: { file },
      ...(formula === undefined ? {} : { formula }),
      ...(units === undefined ? {} : { units }),
    };
  });
}

function notationLessonEntries(): NotationLessonInput[] {
  const lessons: NotationLessonInput[] = [];
  for (const path of filesBelow(join(CONTENT_ROOT, 'docs'), ['.md', '.mdx'])) {
    const slug = docSlug(path);
    if (!isLessonSlug(slug)) continue;
    const { file, data, body } = parseDocument(path);
    const notation = record(data.notation ?? {}, `${file} notation`);
    const local = Array.isArray(notation.local) ? notation.local : [];
    lessons.push({
      lessonId: lessonIdFromSlug(slug),
      status: status(data.editorialStatus, `${file} editorialStatus`),
      localDefinitions: local.map((entry, index) =>
        localDefinition(entry, file, index),
      ),
      references: extractNotationReferences(body, file, undefined),
      body,
      source: { file },
    });
  }
  return lessons;
}

export async function loadNotationRegistryInput(): Promise<NotationRegistryInput> {
  return {
    sharedDefinitions: sharedNotationEntries(),
    lessons: notationLessonEntries(),
  };
}

// --- raw collection records for the Astro markdown pipeline ---------------

/**
 * Notation frontmatter objects for `remark-notation`'s `definitions` option.
 * Returned synchronously because the remark transform reads the loader inline.
 */
export function loadNotationDefinitions(): Record<string, unknown>[] {
  return filesBelow(join(CONTENT_ROOT, 'notation'), ['.md']).map(
    (path) => parseDocument(path).data,
  );
}

/** Parsed `src/content/sources/*.json` records for `remark-citation`. */
export function loadSourceRecords(): Record<string, unknown>[] {
  return jsonEntries<SourceDefinition & { readonly id: string }>(
    join(CONTENT_ROOT, 'sources'),
  ) as unknown as Record<string, unknown>[];
}

/**
 * Assessment ids for one lesson, from its colocated `<name>.checks.yml`. The
 * lesson layout uses this to auto-place `<AssessmentSet>`; nothing is authored
 * in the MDX body.
 */
export function loadLessonChecks(lessonId: string): string[] {
  const slug = lessonId.replace(/\./g, '/');
  for (const extension of ['.mdx', '.md']) {
    const lessonPath = join(CONTENT_ROOT, 'docs', `${slug}${extension}`);
    if (existsSync(lessonPath)) return lessonCheckIds(lessonPath);
  }
  return [];
}

/**
 * Flat view of every notation entry (shared + page-local) for the consistency
 * checks (Step D6): the fields those checks read that the registry input drops
 * or normalizes — the raw `dimensionless` marker and the per-source locator
 * shape. One walk of the same files the loader already parses.
 */
export interface NotationSpec {
  /** `shared:<key>` or `page:<lessonId>:<key>` — matches the registry id. */
  readonly id: string;
  readonly key: string;
  readonly scope: 'shared' | 'local';
  readonly lessonId?: string;
  readonly file: string;
  readonly latex: string;
  readonly units?: string;
  readonly dimensionless: boolean;
  readonly formula?: string;
  readonly sources: readonly {
    readonly id: string;
    readonly hasLocator: boolean;
  }[];
}

function specSources(value: unknown): NotationSpec['sources'] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (typeof entry === 'string') return { id: entry, hasLocator: false };
    const record = (entry ?? {}) as { id?: unknown; locator?: unknown };
    return {
      id: typeof record.id === 'string' ? record.id : '',
      hasLocator:
        typeof record.locator === 'string' && record.locator.trim().length > 0,
    };
  });
}

export function loadNotationSpecs(): NotationSpec[] {
  const specs: NotationSpec[] = [];

  for (const path of filesBelow(join(CONTENT_ROOT, 'notation'), ['.md'])) {
    const { file, data } = parseDocument(path);
    const key = typeof data.key === 'string' ? data.key : basename(path, '.md');
    specs.push({
      id: `shared:${key}`,
      key,
      scope: 'shared',
      file,
      latex: typeof data.latex === 'string' ? data.latex : '',
      ...(typeof data.units === 'string' ? { units: data.units } : {}),
      dimensionless: data.dimensionless === true,
      ...(typeof data.formula === 'string' ? { formula: data.formula } : {}),
      sources: specSources(data.sources),
    });
  }

  for (const path of filesBelow(join(CONTENT_ROOT, 'docs'), ['.md', '.mdx'])) {
    const slug = docSlug(path);
    if (!isLessonSlug(slug)) continue;
    const { file, data } = parseDocument(path);
    const lessonId = lessonIdFromSlug(slug);
    const local = (data as { notation?: { local?: unknown } }).notation?.local;
    if (!Array.isArray(local)) continue;
    for (const raw of local) {
      const entry = (raw ?? {}) as Record<string, unknown>;
      const key = typeof entry.key === 'string' ? entry.key : '';
      specs.push({
        id: `page:${lessonId}:${key}`,
        key,
        scope: 'local',
        lessonId,
        file,
        latex: typeof entry.latex === 'string' ? entry.latex : '',
        ...(typeof entry.units === 'string' ? { units: entry.units } : {}),
        dimensionless: entry.dimensionless === true,
        ...(typeof entry.formula === 'string'
          ? { formula: entry.formula }
          : {}),
        sources: specSources(entry.sources),
      });
    }
  }

  return specs.sort((left, right) => left.id.localeCompare(right.id));
}

/**
 * Notation `sources` entries still written as a bare id rather than
 * `{ id, locator }` (Phase C1b shape). Formalized as the `notation-source-locator`
 * consistency check in Step D6; kept here for the CLI summary line.
 */
export function notationSourceLocatorGaps(): { bare: number; total: number } {
  let bare = 0;
  let total = 0;
  for (const spec of loadNotationSpecs()) {
    for (const source of spec.sources) {
      total += 1;
      if (!source.hasLocator) bare += 1;
    }
  }
  return { bare, total };
}
