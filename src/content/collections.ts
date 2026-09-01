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

import { readFileSync, readdirSync } from 'node:fs';
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
} from '../notation/types';

// Every invocation — the CLI, `astro build`/`check`, and vitest — runs with the
// repository root as the working directory, matching the deleted file loaders.
const REPOSITORY_ROOT = process.cwd();
const CONTENT_ROOT = join(REPOSITORY_ROOT, 'src', 'content');

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

function strings(value: unknown, label: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new TypeError(`${label} must be an array of strings`);
  }
  return [...value] as string[];
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
 * Notation references (`\term{key}`, MDX-safe `\term\{key\}`, `\explain{key}`)
 * in a body, ignoring code fences and inline code, sorted by position.
 */
export function extractNotationReferences(
  text: string,
  file: string,
  kind: NotationReferenceInput['kind'] | undefined,
): NotationReferenceInput[] {
  const references: NotationReferenceInput[] = [];
  const searchable = maskMarkdownLiterals(text);
  const patterns: readonly [RegExp, NotationReferenceInput['kind']][] = [
    [/\\term\\\{([^{}]+)\\\}/g, kind ?? 'prose'],
    [/\\term\{([^{}]+)\}/g, kind ?? 'prose'],
    [/\\explain\{([^{}]+)\}/g, kind ?? 'math'],
  ];

  for (const [pattern, referenceKind] of patterns) {
    for (const match of searchable.matchAll(pattern)) {
      references.push({
        key: (match[1] ?? '').trim(),
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

function lessonEntries(): LessonDefinition[] {
  const lessons: LessonDefinition[] = [];
  for (const path of filesBelow(join(CONTENT_ROOT, 'docs'), ['.md', '.mdx'])) {
    const { data, body } = parseDocument(path);
    if (typeof data.lessonId !== 'string') continue;
    lessons.push({
      id: data.lessonId,
      status: data.editorialStatus as LessonDefinition['status'],
      requires: (data.requires as string[] | undefined) ?? [],
      teaches: (data.teaches as string[] | undefined) ?? [],
      assessments: (data.assessments as string[] | undefined) ?? [],
      sources: (data.sources as string[] | undefined) ?? [],
      assumptions: (data.assumptions as string[] | undefined) ?? [],
      body,
    });
  }
  return lessons;
}

export async function loadCurriculumCatalog(): Promise<CurriculumCatalog> {
  return {
    competencies: jsonEntries<CompetencyDefinition>(
      join(CONTENT_ROOT, 'competencies'),
    ),
    lessons: lessonEntries(),
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
  const label = `${file} notation.local[${index}]`;
  const data = record(raw, label);
  // Reduced shape (Phase C1): `latex`/`meaning`; the pre-C1 names
  // `notation`/`summary`/`title` are still read until the C2 codemod.
  const latex = string(data.latex ?? data.notation, `${label}.latex`);
  const meaning = string(data.meaning ?? data.summary, `${label}.meaning`);
  const details = optionalString(data.details, `${label}.details`);
  const formula = optionalString(data.formula, `${label}.formula`);
  const units = optionalString(data.units, `${label}.units`);
  const definitionText = [meaning, details, formula]
    .filter((value): value is string => value !== undefined)
    .join('\n');

  return {
    key: string(data.key, `${label}.key`),
    notation: latex,
    title: string(data.title ?? meaning, `${label}.title`),
    summary: meaning,
    sources: strings(data.sources, `${label}.sources`),
    seeAlso: strings(data.seeAlso, `${label}.seeAlso`),
    alignment:
      data.alignment === undefined
        ? { kind: 'general', rationale: 'Lesson-local symbol.' }
        : alignment(data.alignment, `${label}.alignment`),
    references: extractNotationReferences(definitionText, file, 'definition'),
    source: { file },
    ...(details === undefined ? {} : { details }),
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
    const perspective = optionalString(data.perspective, `${file} perspective`);
    return {
      key,
      notation: string(data.notation, `${file} notation`),
      title: string(data.title, `${file} title`),
      summary: string(data.summary, `${file} summary`),
      aliases: strings(data.aliases, `${file} aliases`),
      domain: string(data.domain, `${file} domain`),
      sources: strings(data.sources, `${file} sources`),
      seeAlso: strings(data.seeAlso, `${file} seeAlso`),
      alignment: alignment(data.alignment, `${file} alignment`),
      status: status(data.editorialStatus, `${file} editorialStatus`),
      aiAssisted: boolean(data.aiAssisted, `${file} aiAssisted`),
      body,
      references: extractNotationReferences(body, file, undefined),
      source: { file },
      ...(units === undefined ? {} : { units }),
      ...(perspective === undefined ? {} : { perspective }),
    };
  });
}

function notationLessonEntries(): NotationLessonInput[] {
  const lessons: NotationLessonInput[] = [];
  for (const path of filesBelow(join(CONTENT_ROOT, 'docs'), ['.md', '.mdx'])) {
    const { file, data, body } = parseDocument(path);
    if (typeof data.lessonId !== 'string') continue;
    const notation = record(data.notation ?? {}, `${file} notation`);
    const local = Array.isArray(notation.local) ? notation.local : [];
    lessons.push({
      lessonId: data.lessonId,
      status: status(data.editorialStatus, `${file} editorialStatus`),
      uses: strings(notation.uses, `${file} notation.uses`),
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
