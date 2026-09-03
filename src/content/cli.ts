/**
 * The `content` CLI core (Phase G1).
 *
 * `scripts/content.ts` is a thin argv wrapper; every command's logic lives here
 * as a pure-ish function that takes a compiled {@link Manifest} and returns a
 * plain data object. The router is **read-only** — only `content new` touches
 * the filesystem, and even then `scaffoldLesson` / `scaffoldTerm` only return
 * the path + contents for the wrapper to write, and never overwrite.
 *
 * Design points the G1 gate pins:
 *   - Every diagnostic carries a **stable code** (`<source>:<kind>`), never a
 *     bare string, so an AI caller can branch on it.
 *   - `--json` output is data only: no stack traces. The wrapper converts any
 *     thrown {@link ContentCliError} (and any unexpected error) into
 *     `{ code, message }`.
 *   - `content context <lesson>` emits that lesson plus only what a drafter
 *     needs — direct-prerequisite outcomes, the resolved notation bundle, cited
 *     source metadata + locators, the section's domain signatures, and the
 *     lesson's current diagnostics — and reports token counts against the doc
 *     set + corpus so the size win is visible.
 *   - `content check` compiles the lesson MDX → remark → KaTeX → HTML and fails
 *     on any renderability error (unparseable MDX, KaTeX error, unresolved
 *     notation, unknown `[[key]]`, unknown citation), on top of the manifest's
 *     schema / ref / math / equation diagnostics for that lesson.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  createMarkdownProcessor,
  parseFrontmatter,
} from '@astrojs/markdown-remark';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

import { createNotationKatexOptions } from '../reference/katex-options.mjs';
import rehypeFailKatexErrors from '../reference/rehype-fail-katex-errors.mjs';
import remarkCitation from '../reference/remark-citation.mjs';
import remarkNotation from '../reference/remark-notation.mjs';
import type { Manifest, ManifestLesson } from './manifest';
import { isLessonSlug, lessonIdFromSlug } from './lesson-derivation';

const REPOSITORY_ROOT = process.cwd();
const CONTENT_ROOT = join(REPOSITORY_ROOT, 'src', 'content');
const DOCS_ROOT = join(CONTENT_ROOT, 'docs');
const DOMAIN_ROOT = join(REPOSITORY_ROOT, 'src', 'domain');

// --- errors --------------------------------------------------------------

export type ContentCliCode =
  | 'unknown-command'
  | 'usage'
  | 'unknown-lesson'
  | 'unknown-kind'
  | 'invalid-id'
  | 'exists'
  | 'not-a-lesson'
  | 'no-git';

/** A user-facing failure with a stable code and no stack in `--json` output. */
export class ContentCliError extends Error {
  readonly code: ContentCliCode;
  constructor(code: ContentCliCode, message: string) {
    super(message);
    this.name = 'ContentCliError';
    this.code = code;
  }
}

// --- diagnostics ------------------------------------------------------

/** One normalized diagnostic. `code` is `<source>:<kind>` and always stable. */
export interface CliDiagnostic {
  readonly code: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly file?: string;
  readonly line?: number;
}

function mentions(message: string, lessonId: string, file: string): boolean {
  return (
    message.includes(lessonId) ||
    message.includes(file) ||
    message.includes(file.replace(/^src\/content\/docs\//, ''))
  );
}

/**
 * Every manifest diagnostic that names this lesson (by id or file), normalized
 * to {@link CliDiagnostic}. Corpus-wide checks (curriculum) are included only
 * when their message mentions the lesson; per-file checks (notation, math,
 * equations, consistency) are filtered by `file`.
 */
export function lessonDiagnostics(
  manifest: Manifest,
  lesson: ManifestLesson,
): CliDiagnostic[] {
  const out: CliDiagnostic[] = [];
  const { file, id } = lesson;
  const assessments = new Set(lesson.assessments);
  const withFile = (value?: string) =>
    value === undefined ? {} : { file: value };

  for (const issue of manifest.diagnostics.curriculum) {
    if (!mentions(issue.message, id, file)) continue;
    out.push({
      code: `curriculum:${issue.kind}`,
      severity: issue.severity === 'warning' ? 'warning' : 'error',
      message: issue.message,
    });
  }

  for (const diagnostic of [
    ...manifest.diagnostics.notation.map((d) => ['notation', d] as const),
    ...manifest.diagnostics.alignment.map((d) => ['alignment', d] as const),
  ]) {
    const [group, entry] = diagnostic;
    const entryFile = entry.source?.file;
    if (
      entry.lessonId !== id &&
      entryFile !== file &&
      !mentions(entry.message, id, file)
    ) {
      continue;
    }
    out.push({
      code: `${group}:${entry.code}`,
      severity: entry.severity === 'warning' ? 'warning' : 'error',
      message: entry.message,
      ...withFile(entryFile),
    });
  }

  for (const diagnostic of manifest.diagnostics.math) {
    const forLesson =
      diagnostic.file === file ||
      (diagnostic.context === 'assessment' &&
        [...assessments].some((assessmentId) =>
          diagnostic.file.startsWith(`${assessmentId} `),
        ));
    if (!forLesson) continue;
    out.push({
      code: `math:${diagnostic.context}`,
      severity: diagnostic.severity,
      message: diagnostic.message,
      file: diagnostic.file,
      ...(diagnostic.line === undefined ? {} : { line: diagnostic.line }),
    });
  }

  for (const diagnostic of manifest.diagnostics.equations) {
    if (
      diagnostic.lessonId !== id &&
      diagnostic.file !== file &&
      !mentions(diagnostic.message, id, file)
    ) {
      continue;
    }
    out.push({
      code: `equations:${diagnostic.code}`,
      severity: diagnostic.severity === 'warning' ? 'warning' : 'error',
      message: diagnostic.message,
      ...withFile(diagnostic.file),
    });
  }

  for (const diagnostic of manifest.diagnostics.consistency) {
    if (diagnostic.file !== file && diagnostic.lessonId !== id) continue;
    out.push({
      code: `consistency:${diagnostic.code}`,
      severity: 'warning',
      message: diagnostic.message,
      ...withFile(diagnostic.file),
    });
  }

  return out.sort(
    (a, b) =>
      a.code.localeCompare(b.code) || a.message.localeCompare(b.message),
  );
}

// --- renderability -------------------------------------------------------

let processorPromise:
  Promise<Awaited<ReturnType<typeof createMarkdownProcessor>>> | undefined;

function processorFor(manifest: Manifest) {
  processorPromise ??= createMarkdownProcessor({
    syntaxHighlight: false,
    smartypants: false,
    remarkPlugins: [
      remarkMath,
      [
        remarkNotation,
        {
          definitions: manifest.notation.raw,
          equations: manifest.equations.numbersBySlug,
        },
      ],
      [remarkCitation, { sources: manifest.sources }],
    ],
    rehypePlugins: [
      [rehypeKatex, createNotationKatexOptions()],
      rehypeFailKatexErrors,
    ],
  });
  return processorPromise;
}

/** Drop `import` / `export` lines so they don't render as stray prose. */
function stripEsm(body: string): string {
  return body.replace(/^(?:import|export)\s[^\n]*\n?/gm, '');
}

/** Classify a render error by which pipeline stage raised it. */
function renderErrorCode(message: string): string {
  if (/Unresolved notation/i.test(message)) return 'render:notation';
  if (/KaTeX|ParseError|katex-error/i.test(message)) return 'render:katex';
  if (
    /Unknown notation key|Malformed notation|Invalid notation key/i.test(
      message,
    )
  ) {
    return 'render:notation';
  }
  if (/equation reference|display equation|equation label eq:/i.test(message)) {
    return 'render:equation';
  }
  if (/Unknown (?:source|citation)|Malformed citation/i.test(message)) {
    return 'render:citation';
  }
  return 'render:mdx';
}

export interface RenderResult {
  readonly rendered: boolean;
  readonly diagnostics: readonly CliDiagnostic[];
}

/**
 * Compile one lesson body through the real remark → KaTeX → HTML pipeline and
 * report the first failure as a coded diagnostic. Exported so a fixture body
 * can be checked directly, without a manifest entry.
 */
export async function renderLesson(
  manifest: Manifest,
  input: { body: string; frontmatter: Record<string, unknown>; path: string },
): Promise<RenderResult> {
  const processor = await processorFor(manifest);
  const lessonId = lessonIdFromSlug(
    relative(DOCS_ROOT, input.path).replace(/\\/g, '/'),
  );
  try {
    await processor.render(stripEsm(input.body), {
      frontmatter: { ...input.frontmatter, lessonId },
      fileURL: pathToFileURL(input.path),
    });
    return { rendered: true, diagnostics: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      rendered: false,
      diagnostics: [
        { code: renderErrorCode(message), severity: 'error', message },
      ],
    };
  }
}

// --- token estimate ----------------------------------------------------

/** Rough token estimate — ~4 chars/token, the usual GPT-family heuristic. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function readIfExists(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function walkFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walkFiles(path);
    return entry.isFile() ? [path] : [];
  });
}

export interface TokenCounts {
  /** Tokens in the serialized `content context` payload. */
  readonly context: number;
  /** `README.md` + `AGENTS.md` + `docs/architecture.md`. */
  readonly docSet: number;
  /** Every file under `src/content/`. */
  readonly corpus: number;
  /** `context / (docSet + corpus)`, rounded to 4 dp. */
  readonly ratio: number;
}

function docSetTokens(): number {
  return ['README.md', 'AGENTS.md', join('docs', 'architecture.md')]
    .map((relPath) =>
      estimateTokens(readIfExists(join(REPOSITORY_ROOT, relPath))),
    )
    .reduce((sum, value) => sum + value, 0);
}

function corpusTokens(): number {
  return walkFiles(CONTENT_ROOT)
    .map((path) => estimateTokens(readFileSync(path, 'utf8')))
    .reduce((sum, value) => sum + value, 0);
}

function tokenCounts(contextPayload: unknown): TokenCounts {
  const context = estimateTokens(JSON.stringify(contextPayload));
  const docSet = docSetTokens();
  const corpus = corpusTokens();
  const baseline = docSet + corpus;
  return {
    context,
    docSet,
    corpus,
    ratio: baseline === 0 ? 0 : Math.round((context / baseline) * 1e4) / 1e4,
  };
}

// --- lesson lookup + body --------------------------------------------

/** Normalize `foundations/discount-factors` or the dotted id to the dotted id. */
export function normalizeLessonId(raw: string): string {
  const trimmed = raw.trim().replace(/\.mdx?$/, '');
  if (trimmed.includes('/')) return trimmed.replace(/\//g, '.');
  return trimmed;
}

export function findLesson(manifest: Manifest, rawId: string): ManifestLesson {
  const id = normalizeLessonId(rawId);
  const lesson = manifest.lessons.find((entry) => entry.id === id);
  if (!lesson) {
    throw new ContentCliError(
      'unknown-lesson',
      `No lesson ${JSON.stringify(id)}. Known ids: ${manifest.lessons
        .map((entry) => entry.id)
        .join(', ')}`,
    );
  }
  return lesson;
}

function lessonAbsolutePath(lesson: ManifestLesson): string {
  return join(REPOSITORY_ROOT, lesson.file);
}

function lessonRaw(lesson: ManifestLesson): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const parsed = parseFrontmatter(
    readFileSync(lessonAbsolutePath(lesson), 'utf8'),
  );
  return {
    frontmatter: (parsed.frontmatter ?? {}) as Record<string, unknown>,
    body: parsed.content.replace(/^\n/, ''),
  };
}

// --- domain signatures ------------------------------------------------

/**
 * Which `src/domain/` folders a lesson section draws on. A pragmatic map: most
 * sections share a name with a domain folder; the mismatches (`foundations`
 * pulls the shared primitives, option sections reuse the underlying folder)
 * are listed explicitly.
 */
const DOMAIN_DIRS_BY_SECTION: Record<string, readonly string[]> = {
  foundations: ['.', 'rates', 'valuation'],
  bonds: ['bonds', 'rates'],
  rates: ['rates'],
  derivatives: ['derivatives', 'valuation'],
  'bond-options': ['bonds', 'derivatives', 'valuation'],
  credit: ['credit'],
  cds: ['cds', 'credit'],
};

const EXPORT_FN =
  /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*(\([\s\S]*?\))\s*(?::\s*([^\n{]+?))?\s*\{/g;
const EXPORT_ARROW =
  /export\s+const\s+([A-Za-z0-9_]+)\s*(?::\s*[^=\n]+)?=\s*(?:async\s*)?(\([\s\S]*?\))\s*(?::\s*([^=\n]+?))?\s*=>/g;

function signaturesInFile(path: string): string[] {
  const source = readFileSync(path, 'utf8');
  const out: string[] = [];
  for (const pattern of [EXPORT_FN, EXPORT_ARROW]) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source))) {
      const params = (match[2] ?? '').replace(/\s+/g, ' ').trim();
      const ret = (match[3] ?? '').replace(/\s+/g, ' ').trim();
      out.push(`${match[1]}${params}${ret ? `: ${ret}` : ''}`);
    }
  }
  return out.sort();
}

export interface DomainFileSignatures {
  readonly file: string;
  readonly signatures: readonly string[];
}

function domainSignaturesForSection(section: string): DomainFileSignatures[] {
  const dirs = DOMAIN_DIRS_BY_SECTION[section] ?? [section];
  const files = new Set<string>();
  for (const dir of dirs) {
    const base = dir === '.' ? DOMAIN_ROOT : join(DOMAIN_ROOT, dir);
    if (dir === '.') {
      for (const entry of existsSync(base) ? readdirSync(base) : []) {
        if (entry.endsWith('.ts')) files.add(join(base, entry));
      }
    } else {
      for (const path of walkFiles(base)) {
        if (path.endsWith('.ts')) files.add(path);
      }
    }
  }
  return [...files]
    .sort()
    .map((path) => ({
      file: relative(REPOSITORY_ROOT, path).replace(/\\/g, '/'),
      signatures: signaturesInFile(path),
    }))
    .filter((entry) => entry.signatures.length > 0);
}

// --- content status ------------------------------------------------------

export interface StatusReport {
  readonly counts: {
    readonly lessons: number;
    readonly competencies: number;
    readonly assessments: number;
    readonly sources: number;
    readonly tracks: number;
    readonly notationDefinitions: number;
    readonly keyedEquations: number;
  };
  readonly draftDebt: {
    readonly lessons: readonly string[];
    readonly notation: readonly string[];
  };
  readonly orphans: readonly CliDiagnostic[];
  readonly diagnostics: {
    readonly errors: number;
    readonly warnings: number;
  };
}

export function contentStatus(manifest: Manifest): StatusReport {
  const draftLessons = manifest.lessons
    .filter((lesson) => lesson.status === 'draft')
    .map((lesson) => lesson.id)
    .sort();
  const draftNotation = manifest.notation.definitions
    .filter((definition) => definition.status === 'draft')
    .map((definition) => definition.id)
    .sort();

  const orphans: CliDiagnostic[] = manifest.notation.diagnostics
    .filter((diagnostic) => diagnostic.code === 'unused-definition')
    .map((diagnostic) => ({
      code: `notation:${diagnostic.code}`,
      severity:
        diagnostic.severity === 'warning'
          ? ('warning' as const)
          : ('error' as const),
      message: diagnostic.message,
      ...(diagnostic.source?.file === undefined
        ? {}
        : { file: diagnostic.source.file }),
    }))
    .sort((a, b) => a.message.localeCompare(b.message));

  const allDiagnostics = [
    ...manifest.diagnostics.curriculum.map((d) => d.severity ?? 'error'),
    ...manifest.diagnostics.notation.map((d) => d.severity),
    ...manifest.diagnostics.alignment.map((d) => d.severity),
    ...manifest.diagnostics.math.map((d) => d.severity),
    ...manifest.diagnostics.equations.map((d) => d.severity),
    ...manifest.diagnostics.consistency.map(() => 'warning' as const),
  ];

  const keyedEquations = manifest.lessons.reduce(
    (count, lesson) => count + lesson.equations.length,
    0,
  );
  const assessments = new Set(
    manifest.lessons.flatMap((lesson) => lesson.assessments),
  ).size;

  return {
    counts: {
      lessons: manifest.lessons.length,
      competencies: manifest.competencies.length,
      assessments,
      sources: manifest.sources.length,
      tracks: manifest.tracks.length,
      notationDefinitions: manifest.notation.definitions.length,
      keyedEquations,
    },
    draftDebt: { lessons: draftLessons, notation: draftNotation },
    orphans,
    diagnostics: {
      errors: allDiagnostics.filter((severity) => severity === 'error').length,
      warnings: allDiagnostics.filter((severity) => severity === 'warning')
        .length,
    },
  };
}

// --- content context ---------------------------------------------------

export interface ContextReport {
  readonly lesson: {
    readonly id: string;
    readonly slug: string;
    readonly file: string;
    readonly title: string;
    readonly description: string;
    readonly status: string;
    readonly teaches: readonly string[];
    readonly requires: readonly string[];
    readonly assumptions: readonly string[];
    readonly notationLocal: unknown;
    readonly body: string;
  };
  readonly taughtOutcomes: readonly { id: string; outcome: string }[];
  readonly prerequisiteOutcomes: readonly { id: string; outcome: string }[];
  readonly notation: readonly {
    key: string;
    latex: string;
    meaning: string;
    scope: string;
    units?: string;
    formula?: string;
  }[];
  readonly equations: readonly { key: string; number: string }[];
  readonly sources: readonly {
    id: string;
    title: string;
    type: string;
    recordLocator?: string;
    citedLocators: readonly string[];
  }[];
  readonly domainSignatures: readonly DomainFileSignatures[];
  readonly diagnostics: readonly CliDiagnostic[];
  readonly tokens: TokenCounts;
}

export function contentContext(
  manifest: Manifest,
  rawId: string,
): ContextReport {
  const lesson = findLesson(manifest, rawId);
  const { frontmatter, body } = lessonRaw(lesson);

  const outcomeById = new Map(
    manifest.competencies.map((competency) => [
      String(competency.id),
      String(competency.outcome ?? ''),
    ]),
  );
  const outcomesFor = (ids: readonly string[]) =>
    ids
      .filter((id) => outcomeById.has(id))
      .map((id) => ({ id, outcome: outcomeById.get(id) ?? '' }));

  const sourceById = new Map(
    manifest.sources.map((source) => [String(source.id), source]),
  );
  const citedLocatorsById = new Map<string, string[]>();
  for (const citation of lesson.citations) {
    const list = citedLocatorsById.get(citation.id) ?? [];
    if (citation.locator) list.push(citation.locator);
    citedLocatorsById.set(citation.id, list);
  }

  const contextWithoutTokens = {
    lesson: {
      id: lesson.id,
      slug: lesson.slug,
      file: lesson.file,
      title: lesson.title,
      description: lesson.description,
      status: lesson.status,
      teaches: lesson.teaches,
      requires: lesson.requires,
      assumptions: lesson.assumptions,
      notationLocal:
        (frontmatter.notation as { local?: unknown } | undefined)?.local ?? [],
      body,
    },
    taughtOutcomes: outcomesFor(lesson.teaches),
    prerequisiteOutcomes: outcomesFor(lesson.requires),
    notation: lesson.notation.definitions.map((definition) => ({
      key: definition.key,
      latex: definition.notation,
      meaning: definition.summary,
      scope: definition.scope,
      ...(definition.units === undefined ? {} : { units: definition.units }),
      ...(definition.formula === undefined
        ? {}
        : { formula: definition.formula }),
    })),
    equations: lesson.equations.map((equation) => ({ ...equation })),
    sources: lesson.sources.map((id) => {
      const record = sourceById.get(id) as Record<string, unknown> | undefined;
      return {
        id,
        title: String(record?.title ?? id),
        type: String(record?.type ?? 'unknown'),
        ...(typeof record?.locator === 'string'
          ? { recordLocator: record.locator }
          : {}),
        citedLocators: citedLocatorsById.get(id) ?? [],
      };
    }),
    domainSignatures: domainSignaturesForSection(
      lesson.slug.split('/')[0] ?? '',
    ),
    diagnostics: lessonDiagnostics(manifest, lesson),
  };

  return {
    ...contextWithoutTokens,
    tokens: tokenCounts(contextWithoutTokens),
  };
}

// --- content check ---------------------------------------------------

export interface CheckLessonResult {
  readonly lesson: string;
  readonly file: string;
  readonly ok: boolean;
  readonly rendered: boolean;
  readonly diagnostics: readonly CliDiagnostic[];
}

export interface CheckReport {
  readonly ok: boolean;
  readonly lessons: readonly CheckLessonResult[];
}

async function checkOneLesson(
  manifest: Manifest,
  lesson: ManifestLesson,
): Promise<CheckLessonResult> {
  const manifestDiagnostics = lessonDiagnostics(manifest, lesson);
  const { frontmatter, body } = lessonRaw(lesson);
  const render = await renderLesson(manifest, {
    body,
    frontmatter,
    path: lessonAbsolutePath(lesson),
  });

  const diagnostics = [...manifestDiagnostics, ...render.diagnostics].sort(
    (a, b) =>
      a.code.localeCompare(b.code) || a.message.localeCompare(b.message),
  );
  return {
    lesson: lesson.id,
    file: lesson.file,
    ok: !diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
    rendered: render.rendered,
    diagnostics,
  };
}

/** `.mdx` / `.checks.yml` paths that differ from `HEAD`, tracked or not. */
export function changedLessonIds(): string[] {
  let output: string;
  try {
    const tracked = execFileSync(
      'git',
      ['diff', '--name-only', 'HEAD', '--', 'src/content/docs'],
      { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
    );
    const untracked = execFileSync(
      'git',
      ['ls-files', '--others', '--exclude-standard', '--', 'src/content/docs'],
      { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
    );
    output = `${tracked}\n${untracked}`;
  } catch {
    throw new ContentCliError(
      'no-git',
      'Could not read git status for --changed. Run inside a git working tree.',
    );
  }

  const ids = new Set<string>();
  for (const line of output.split('\n')) {
    const path = line.trim();
    if (!path) continue;
    const slug = path
      .replace(/^src\/content\/docs\//, '')
      .replace(/\.checks\.yml$/, '.mdx')
      .replace(/\.mdx?$/, '');
    if (!isLessonSlug(slug)) continue;
    ids.add(slug.replace(/\//g, '.'));
  }
  return [...ids].sort();
}

export async function contentCheck(
  manifest: Manifest,
  options: { lesson?: string; changed?: boolean },
): Promise<CheckReport> {
  let targets: ManifestLesson[];
  if (options.changed) {
    const ids = changedLessonIds();
    targets = manifest.lessons.filter((lesson) => ids.includes(lesson.id));
  } else {
    if (!options.lesson) {
      throw new ContentCliError(
        'usage',
        'content check needs a <lesson> id or --changed.',
      );
    }
    targets = [findLesson(manifest, options.lesson)];
  }

  const lessons = await Promise.all(
    targets.map((lesson) => checkOneLesson(manifest, lesson)),
  );
  return { ok: lessons.every((entry) => entry.ok), lessons };
}

// --- content new -----------------------------------------------------

const ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

export interface Scaffold {
  /** Repo-relative path the wrapper writes. */
  readonly path: string;
  readonly contents: string;
  /** Companion files (e.g. a lesson's `checks.yml`), also non-overwriting. */
  readonly companions: readonly { path: string; contents: string }[];
}

export function scaffoldLesson(rawId: string): Scaffold {
  const slug = rawId
    .trim()
    .replace(/\.mdx?$/, '')
    .replace(/\./g, '/');
  if (!slug.includes('/')) {
    throw new ContentCliError(
      'invalid-id',
      `A lesson id is <section>/<slug> (or <section>.<slug>), got ${JSON.stringify(rawId)}.`,
    );
  }
  if (
    !isLessonSlug(slug) ||
    slug.split('/').some((part) => !ID_PATTERN.test(part))
  ) {
    throw new ContentCliError(
      'invalid-id',
      `Lesson slug ${JSON.stringify(slug)} is not a valid <section>/<slug>.`,
    );
  }

  const relPath = `src/content/docs/${slug}.mdx`;
  const checksPath = `src/content/docs/${slug}.checks.yml`;
  if (existsSync(join(REPOSITORY_ROOT, relPath))) {
    throw new ContentCliError(
      'exists',
      `${relPath} already exists; not overwriting.`,
    );
  }

  const title = (slug.split('/').at(-1) ?? slug)
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const contents = `---
title: ${title}
description: One sentence on what the reader can do after this lesson.
editorialStatus: draft
teaches: []
assumptions: []
---

import CompactExample from '../../../components/examples/CompactExample.astro';
import AssessmentSet from '../../../components/assessments/AssessmentSet.astro';

## What you will be able to do

After this lesson, you should be able to:

- <!-- one observable outcome per teaches entry -->

## Intuition

<!-- draft prose; every symbol introduced with [[key]] before its first math use -->

## Model

<!-- the reproducible worked example; every numeral tagged to a src/domain/ call or [@source; locator] -->
`;

  return {
    path: relPath,
    contents,
    companions: [
      {
        path: checksPath,
        contents: `# Assessment sets for this lesson. Ids resolve against src/content/assessments/.\n[]\n`,
      },
    ],
  };
}

export function scaffoldTerm(rawKey: string): Scaffold {
  const key = rawKey.trim();
  if (!ID_PATTERN.test(key)) {
    throw new ContentCliError(
      'invalid-id',
      `A notation key is lower-case, dot/hyphen separated, got ${JSON.stringify(rawKey)}.`,
    );
  }
  const relPath = `src/content/notation/${key}.md`;
  if (existsSync(join(REPOSITORY_ROOT, relPath))) {
    throw new ContentCliError(
      'exists',
      `${relPath} already exists; not overwriting.`,
    );
  }

  const contents = `---
key: ${key}
latex: 'x'
meaning: Describe the quantity this symbol denotes.
domain: general
units: stated currency
sources: []
seeAlso: []
alignment:
  kind: general
  rationale: Draft scaffold — set a real alignment before review.
editorialStatus: draft
aiAssisted: true
---

Draft definition for [[${key}]]. Replace this body and the placeholder
frontmatter before moving the entry past \`draft\`.
`;

  return { path: relPath, contents, companions: [] };
}
