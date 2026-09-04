/**
 * The one compiler manifest (Phase D5).
 *
 * `compileManifest()` walks the content tree exactly once — through the single
 * loader in `collections.ts` — builds the notation registry, runs every
 * diagnostic pass, and assembles one deterministic JSON document. Everything
 * downstream reads that document and nothing else:
 *
 *   - `pnpm validate:content` (`scripts/compile-manifest.ts`) regenerates and
 *     writes it, then reports diagnostics.
 *   - `astro.config.mjs` reads the sidebar order and the raw notation / source
 *     records the remark adapters need.
 *   - The page components (`LessonFooter`, `NotationGlossary`, `CurriculumMap`,
 *     `AssessmentSet`) read resolved bundles, backlinks and lesson metadata.
 *     None re-reads the filesystem or rebuilds the registry.
 *   - `pnpm build` runs `validate:content` first, so the file is always current
 *     before `astro build`.
 *
 * The MDX render path (`getCollection` / `render(entry)`) is unchanged: the
 * manifest replaces the *derived* structures, not the Markdown pipeline.
 *
 * Determinism: `serializeManifest` sorts object keys recursively, every array
 * is ordered by a stable key, paths are repo-relative, and nothing records a
 * timestamp. Two compiles of one tree produce a byte-identical file and
 * therefore a byte-identical `dist/`. This is the contract a future MCP server
 * or LMS importer consumes — see `docs/architecture.md` section 15.
 */

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { parseFrontmatter } from '@astrojs/markdown-remark';

import {
  validateCurriculum,
  type CurriculumIssue,
} from '../curriculum/validation';
import {
  runConsistencyChecks,
  type ConsistencyDiagnostic,
} from '../reference/consistency';
import { validateNotationAlignment } from '../reference/curriculum-alignment';
import {
  validateEquations,
  type EquationDiagnostic,
  type EquationLabelRecord,
} from '../reference/equations-validate';
import {
  gateContentMath,
  type MathGateDiagnostic,
} from '../reference/gate-math';
import { loadLintIgnore } from '../reference/lint-ignore';
import { buildNotationRegistry } from '../reference/registry';
import { formulaGlyphScope } from '../reference/gloss';
import type { GlyphScopeEntry } from '../reference/gloss';
import { resolveReferenceId } from '../reference/references';
import type { NotationGlossEntry } from '../reference/types';
import type {
  EditorialStatus,
  NotationBacklink,
  NotationDefinitionRecord,
  NotationDiagnostic,
  NotationLessonInput,
  NotationPageBundle,
} from '../reference/types';
import type { CourseConfig } from './course-config';
import {
  loadCurriculumCatalog,
  loadNotationDefinitions,
  loadNotationRegistryInput,
  loadNotationSpecs,
  loadSourceRecords,
} from './collections';
import {
  buildSidebar,
  deriveSources,
  isLessonSlug,
  type SidebarGroup,
} from './lesson-derivation';

/**
 * Bump when a consumer-visible shape changes. A client asserts against this
 * before trusting the document (`manifest-version-compat`, Tier 5).
 *
 * v2 (D6): `lessons[].notation.resolution` (symbol → key → scope → span) and
 * `diagnostics.consistency` (Tier-3 corpus checks).
 * v3 (D7): `equations` (labelled display equations + cross-page number table),
 * `lessons[].equations`, and `diagnostics.equations`.
 */
export const MANIFEST_SCHEMA_VERSION = 3;

const REPOSITORY_ROOT = process.cwd();
// Content is the top-level `content/` folder; the build output is `build/`
// (Phase F). The engine names only these conventions, never a course path.
const CONTENT_ROOT = join(REPOSITORY_ROOT, 'content');
export const MANIFEST_PATH = join(REPOSITORY_ROOT, 'build', 'manifest.json');

// --- shape ------------------------------------------------------------

export interface ManifestCitation {
  readonly id: string;
  readonly locator?: string;
}

export interface PrereqEdge {
  readonly from: string;
  readonly to: string;
}

/**
 * One resolved notation reference occurrence — the row of the committed
 * per-lesson resolution report (`resolution/<lessonId>.notation.json`).
 */
export interface ManifestNotationResolution {
  /** The resolved definition's LaTeX glyph, or the raw key if unresolved. */
  readonly symbol: string;
  readonly key: string;
  readonly scope: 'shared' | 'local' | 'unresolved';
  readonly definitionId: string | null;
  readonly kind: 'prose' | 'math' | 'definition';
  readonly line: number | null;
  readonly column: number | null;
}

/** One resolved notation entry, denormalized for the lesson footer. */
export interface ManifestLessonNotation {
  readonly id: string;
  readonly key: string;
  readonly scope: 'shared' | 'local';
  readonly notation: string;
  readonly label: string;
  readonly summary: string;
  readonly editorialStatus: EditorialStatus;
  readonly seeAlso: readonly string[];
  readonly units?: string;
  readonly formula?: string;
  /** Symbols the formula names that have no card of their own (D15). */
  readonly glosses: readonly NotationGlossEntry[];
  /**
   * Entry-scoped glyph table for `formula` — the entry, its glosses, and any
   * card the formula names. Precomputed here because the whole card set lives
   * in the compiler, not in the page component.
   */
  readonly formulaScope: readonly GlyphScopeEntry[];
}

export interface ManifestLesson {
  readonly id: string;
  /** Docs-loader slug, e.g. `bonds/price-yield-relationship`. */
  readonly slug: string;
  readonly file: string;
  readonly title: string;
  readonly description: string;
  readonly status: EditorialStatus;
  /** Ordered — the curriculum contract. */
  readonly teaches: readonly string[];
  readonly requires: readonly string[];
  readonly assumptions: readonly string[];
  readonly assessments: readonly string[];
  readonly sources: readonly string[];
  readonly citations: readonly ManifestCitation[];
  /** Competency prerequisite edges this lesson introduces. */
  readonly prereqEdges: readonly PrereqEdge[];
  /** Labelled display equations in appearance order (D7). */
  readonly equations: readonly {
    readonly key: string;
    readonly number: string;
  }[];
  readonly notation: {
    readonly bindings: readonly {
      readonly key: string;
      readonly definitionId: string;
    }[];
    readonly definitionIds: readonly string[];
    readonly definitions: readonly ManifestLessonNotation[];
    /** Every `[[key]]` / `\explain{key}` occurrence, resolved and located. */
    readonly resolution: readonly ManifestNotationResolution[];
  };
}

export interface Manifest {
  readonly schemaVersion: number;
  readonly notation: {
    readonly definitions: readonly NotationDefinitionRecord[];
    readonly bundles: readonly NotationPageBundle[];
    readonly backlinks: readonly NotationBacklink[];
    readonly diagnostics: readonly NotationDiagnostic[];
    /** Raw notation frontmatter for `remarkNotation`, ordered by key. */
    readonly raw: readonly Record<string, unknown>[];
  };
  readonly competencies: readonly Record<string, unknown>[];
  readonly sources: readonly Record<string, unknown>[];
  readonly tracks: readonly Record<string, unknown>[];
  readonly sidebar: readonly SidebarGroup[];
  readonly lessons: readonly ManifestLesson[];
  /** Full competency prerequisite graph. */
  readonly prereqEdges: readonly PrereqEdge[];
  /** Equation identity (D7): every labelled display equation + the render-path lookup. */
  readonly equations: {
    readonly labels: readonly EquationLabelRecord[];
    /** `slug -> { eqKey: number }` — passed to `remarkNotation` for `[[slug#eq:key]]`. */
    readonly numbersBySlug: Record<string, Record<string, string>>;
  };
  readonly diagnostics: {
    readonly curriculum: readonly CurriculumIssue[];
    readonly notation: readonly NotationDiagnostic[];
    readonly alignment: readonly NotationDiagnostic[];
    readonly math: readonly MathGateDiagnostic[];
    /** Tier-3 corpus consistency checks (D6). Warnings only. */
    readonly consistency: readonly ConsistencyDiagnostic[];
    /** Equation-identity checks (D7): `eq-duplicate-key`, `eq-ref-resolves` (error); `eq-key-unused` (warning). */
    readonly equations: readonly EquationDiagnostic[];
  };
  readonly hashes: {
    /** `sha256` of every content source file, keyed by repo-relative path. */
    readonly content: Record<string, string>;
    /** Single fingerprint of the content tree. */
    readonly contentTree: string;
  };
}

// --- compile ---------------------------------------------------------

const CITE_PATTERN = /\[@([a-z0-9][a-z0-9.-]*)(?:;[ \t\r\n]*([^\]]*))?\]/g;

/** Distinct `[@id; locator]` occurrences in a body, in first-appearance order. */
function lessonCitations(body: string): ManifestCitation[] {
  const withoutCode = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '');
  const seen = new Set<string>();
  const citations: ManifestCitation[] = [];
  for (const match of withoutCode.matchAll(CITE_PATTERN)) {
    const id = (match[1] ?? '').trim();
    const locator = (match[2] ?? '').replace(/\s+/g, ' ').trim() || undefined;
    const dedupeKey = `${id} ${locator ?? ''}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    citations.push(locator === undefined ? { id } : { id, locator });
  }
  return citations;
}

function contentHashes(): {
  content: Record<string, string>;
  contentTree: string;
} {
  const files: string[] = [];
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) files.push(path);
    }
  };
  walk(CONTENT_ROOT);
  files.sort();

  const content: Record<string, string> = {};
  const tree = createHash('sha256');
  for (const path of files) {
    const relPath = relative(REPOSITORY_ROOT, path).replace(/\\/g, '/');
    const digest = createHash('sha256')
      .update(readFileSync(path))
      .digest('hex');
    content[relPath] = `sha256:${digest}`;
    tree.update(`${relPath} ${digest}\n`);
  }
  return { content, contentTree: `sha256:${tree.digest('hex')}` };
}

/**
 * Every `[[key]]` / `\explain{key}` occurrence in a lesson, resolved by lexical
 * scope (page-local first, then shared) and located. The rows of the committed
 * resolution report (D6 (d)); order follows `references`, already sorted by
 * (line, column, key).
 */
function lessonNotationResolution(
  lesson: NotationLessonInput,
  definitionsById: ReadonlyMap<string, NotationDefinitionRecord>,
  availableDefinitionIds: ReadonlySet<string>,
): ManifestNotationResolution[] {
  const scope = { kind: 'page' as const, lessonId: lesson.lessonId };
  return lesson.references.map((reference) => {
    const definitionId = resolveReferenceId(
      reference.key,
      scope,
      availableDefinitionIds,
    );
    const definition =
      definitionId === undefined
        ? undefined
        : definitionsById.get(definitionId);
    return {
      symbol: definition?.notation ?? reference.key,
      key: reference.key,
      scope: definition
        ? definition.kind === 'shared'
          ? 'shared'
          : 'local'
        : 'unresolved',
      definitionId: definitionId ?? null,
      kind: reference.kind,
      line: reference.source.line ?? null,
      column: reference.source.column ?? null,
    };
  });
}

function lessonNotationBundle(
  bundle: NotationPageBundle | undefined,
  definitionsById: ReadonlyMap<string, NotationDefinitionRecord>,
  resolution: readonly ManifestNotationResolution[],
  cardsByKey: ReadonlyMap<string, GlyphScopeEntry>,
): ManifestLesson['notation'] {
  const definitions: ManifestLessonNotation[] = [];
  for (const definitionId of bundle?.definitionIds ?? []) {
    const definition = definitionsById.get(definitionId);
    if (!definition) continue;
    definitions.push({
      id: definition.id,
      key: definition.key,
      scope: definition.kind === 'shared' ? 'shared' : 'local',
      notation: definition.notation,
      label: definition.label,
      summary: definition.summary,
      editorialStatus: definition.status,
      seeAlso: [...definition.seeAlso],
      glosses: [...definition.glosses],
      formulaScope: formulaGlyphScope({
        key: definition.key,
        notation: definition.notation,
        glosses: definition.glosses,
        cardsByKey,
        ...(definition.formula === undefined
          ? {}
          : { formula: definition.formula }),
      }),
      ...(definition.units === undefined ? {} : { units: definition.units }),
      ...(definition.formula === undefined
        ? {}
        : { formula: definition.formula }),
    });
  }
  return {
    bindings: [...(bundle?.bindings ?? [])].map((binding) => ({ ...binding })),
    definitionIds: [...(bundle?.definitionIds ?? [])],
    definitions,
    resolution: [...resolution],
  };
}

/** `title` / `description` from a lesson's raw docs frontmatter, keyed by id. */
function lessonFrontmatterById(): Map<
  string,
  { title: string; description: string }
> {
  const base = join(CONTENT_ROOT, 'docs');
  const result = new Map<string, { title: string; description: string }>();
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      if (!entry.isFile() || !/\.mdx?$/.test(entry.name)) continue;
      const slug = relative(base, path).replace(/\\/g, '/');
      if (!isLessonSlug(slug)) continue;
      const id = slug.replace(/\.(md|mdx)$/, '').replace(/\//g, '.');
      const data = (parseFrontmatter(readFileSync(path, 'utf8')).frontmatter ??
        {}) as Record<string, unknown>;
      result.set(id, {
        title: typeof data.title === 'string' ? data.title : id,
        description:
          typeof data.description === 'string' ? data.description : '',
      });
    }
  };
  walk(base);
  return result;
}

/**
 * The engine never imports the course's config file — the caller passes it.
 * `astro.config.mjs` and `scripts/*` import `content/course.config.ts` (they are
 * the wiring layer); tests pass a `CourseConfig` value directly.
 */
export async function compileManifest(
  courseConfig: CourseConfig,
): Promise<Manifest> {
  const [catalog, notationInput] = await Promise.all([
    loadCurriculumCatalog(),
    loadNotationRegistryInput(),
  ]);

  const registry = buildNotationRegistry(notationInput);
  // Cards a `formula` may name with `\explain{key}` (D15). Shared entries
  // only: a page-local symbol is not addressable from another entry.
  const cardsByKey = new Map<string, GlyphScopeEntry>(
    notationInput.sharedDefinitions.map((definition) => [
      definition.key,
      { key: definition.key, notation: definition.notation },
    ]),
  );
  const definitionsById = new Map(
    registry.definitions.map((definition) => [definition.id, definition]),
  );
  const availableDefinitionIds = new Set(definitionsById.keys());
  const bundlesByLesson = new Map(
    registry.bundles.map((bundle) => [bundle.lessonId, bundle]),
  );

  const curriculumIssues = validateCurriculum(catalog);
  const alignmentIssues = validateNotationAlignment(registry, catalog);
  const mathIssues = gateContentMath({
    notationInput,
    assessments: catalog.assessments as unknown as {
      id: string;
      items?: { id?: string; prompt?: string; explanation?: string }[];
    }[],
    lessonAssessments: catalog.lessons.map((lesson) => ({
      lessonId: lesson.id,
      assessmentIds: lesson.assessments,
    })),
  });

  const prerequisitesById = new Map(
    catalog.competencies.map((competency) => [
      competency.id,
      competency.prerequisites ?? [],
    ]),
  );
  const sortEdges = (edges: PrereqEdge[]): PrereqEdge[] =>
    edges.sort(
      (a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to),
    );
  const prereqEdges = sortEdges(
    [...prerequisitesById].flatMap(([to, prerequisites]) =>
      prerequisites.map((from) => ({ from, to })),
    ),
  );

  const lessonMetaById = new Map(
    catalog.lessons.map((lesson) => [lesson.id, lesson]),
  );
  const frontmatterById = lessonFrontmatterById();

  const equationValidation = validateEquations(
    notationInput.lessons.map((lesson) => ({
      lessonId: lesson.lessonId,
      slug: lesson.lessonId.replace(/\./g, '/'),
      file: lesson.source.file,
      body: lesson.body,
    })),
  );
  const equationsBySlug = new Map(
    Object.entries(equationValidation.numbersBySlug).map(([slug, table]) => [
      slug,
      Object.entries(table).map(([key, number]) => ({ key, number })),
    ]),
  );

  const lessons: ManifestLesson[] = [];
  for (const notationLesson of notationInput.lessons) {
    const id = notationLesson.lessonId;
    const meta = lessonMetaById.get(id);
    if (!meta) continue;
    const teaches = meta.teaches;
    const frontmatter = frontmatterById.get(id) ?? {
      title: id,
      description: '',
    };
    lessons.push({
      id,
      slug: id.replace(/\./g, '/'),
      file: notationLesson.source.file,
      title: frontmatter.title,
      description: frontmatter.description,
      status: meta.status,
      teaches: [...teaches],
      requires: [...meta.requires],
      assumptions: [...meta.assumptions],
      assessments: [...meta.assessments],
      sources: deriveSources(notationLesson.body),
      citations: lessonCitations(notationLesson.body),
      equations: equationsBySlug.get(id.replace(/\./g, '/')) ?? [],
      prereqEdges: sortEdges(
        teaches.flatMap((to) =>
          (prerequisitesById.get(to) ?? [])
            .filter((from) => !teaches.includes(from))
            .map((from) => ({ from, to })),
        ),
      ),
      notation: lessonNotationBundle(
        bundlesByLesson.get(id),
        definitionsById,
        lessonNotationResolution(
          notationLesson,
          definitionsById,
          availableDefinitionIds,
        ),
        cardsByKey,
      ),
    });
  }
  lessons.sort((a, b) => a.id.localeCompare(b.id));

  const consistencyIssues = runConsistencyChecks({
    registry,
    notationInput,
    specs: loadNotationSpecs(),
    catalog,
    lintIgnore: loadLintIgnore(),
    conventions: courseConfig.conventions,
  });

  const rawNotation = [...loadNotationDefinitions()].sort((a, b) =>
    String(a.key).localeCompare(String(b.key)),
  );
  const competencies = catalog.competencies
    .map((entry) => ({ ...entry }))
    .sort(byId);
  const sources = [...loadSourceRecords()].sort(byId);
  const tracks = catalog.tracks.map((entry) => ({ ...entry })).sort(byId);

  const lessonSlugs = [...notationInput.lessons]
    .map((lesson) => lesson.lessonId.replace(/\./g, '/'))
    .sort();
  const sidebar = buildSidebar(
    catalog.tracks.map((track) => ({ id: track.id, lessons: track.lessons })),
    lessonSlugs,
    courseConfig.sections,
  );

  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    notation: {
      definitions: registry.definitions,
      bundles: registry.bundles,
      backlinks: registry.backlinks,
      diagnostics: registry.diagnostics,
      raw: rawNotation,
    },
    competencies,
    sources,
    tracks,
    sidebar,
    lessons,
    prereqEdges,
    equations: {
      labels: equationValidation.labels,
      numbersBySlug: equationValidation.numbersBySlug,
    },
    diagnostics: {
      curriculum: curriculumIssues,
      notation: registry.diagnostics,
      alignment: alignmentIssues,
      math: mathIssues,
      consistency: consistencyIssues,
      equations: equationValidation.diagnostics,
    },
    hashes: contentHashes(),
  };
}

function byId(a: Record<string, unknown>, b: Record<string, unknown>): number {
  return String(a.id).localeCompare(String(b.id));
}

// --- serialize / read / write --------------------------------------

/** JSON with recursively sorted object keys — the byte-identical contract. */
export function serializeManifest(manifest: Manifest): string {
  const sortKeys = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sortKeys);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.keys(value as Record<string, unknown>)
          .sort()
          .map((key) => [
            key,
            sortKeys((value as Record<string, unknown>)[key]),
          ]),
      );
    }
    return value;
  };
  return `${JSON.stringify(sortKeys(manifest), null, 2)}\n`;
}

export function writeManifest(manifest: Manifest): void {
  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, serializeManifest(manifest));
}

export function readManifestSync(): Manifest {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(
      `Manifest not found at ${relative(REPOSITORY_ROOT, MANIFEST_PATH)}. Run \`pnpm validate:content\` first.`,
    );
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
}

/**
 * The reader every consumer uses. Reads `build/manifest.json` when it exists —
 * the case for every page component, since `pnpm build` / `pnpm verify` run
 * `validate:content` first. Only a cold `astro dev` misses, and `astro.config.mjs`
 * passes `courseConfig` there so this can compile once; an engine consumer that
 * hits a cold miss with no config gets a clear "run validate:content" error
 * rather than the engine reaching into the course tree.
 */
export async function loadManifest(
  courseConfig?: CourseConfig,
): Promise<Manifest> {
  if (existsSync(MANIFEST_PATH)) return readManifestSync();
  if (!courseConfig) {
    throw new Error(
      `${relative(REPOSITORY_ROOT, MANIFEST_PATH)} not found. Run \`pnpm validate:content\` first.`,
    );
  }
  const manifest = await compileManifest(courseConfig);
  writeManifest(manifest);
  return manifest;
}
