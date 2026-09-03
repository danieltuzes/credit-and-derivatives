/**
 * The committed per-lesson resolution report (Step D6 (d)).
 *
 * `compileManifest()` already resolves every `[[key]]` / `\explain{key}`
 * occurrence to a definition, scope, and source span
 * (`manifest.lessons[].notation.resolution`). That lives in the git-ignored
 * `.generated/manifest.json`, so this module projects it into
 * `resolution/<lessonId>.notation.json` — one small, diff-checkable file per
 * lesson — plus `resolution/consistency-report.json` for the Tier-3 corpus
 * checks. `pnpm validate:content` regenerates them and **fails if a committed
 * file is stale**, so a drift between content and the checked-in report cannot
 * pass CI unnoticed.
 *
 * The reports are deterministic: keys are sorted recursively, rows follow the
 * manifest's stable ordering, and nothing records a timestamp or a content
 * hash — a file changes only when a resolution or a finding changes.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import {
  consistencyCounts,
  type ConsistencyDiagnostic,
} from '../reference/consistency';
import { MANIFEST_SCHEMA_VERSION, type Manifest } from './manifest';

const REPOSITORY_ROOT = process.cwd();
const RESOLUTION_DIR = join(REPOSITORY_ROOT, 'build', 'resolution');
/** Repo-relative prefix for the map keys and the stale-path messages (Phase F). */
const RESOLUTION_PREFIX = 'build/resolution/';
const CONSISTENCY_FILE = 'consistency-report.json';

/** JSON with recursively sorted object keys and a trailing newline. */
function stableJson(value: unknown): string {
  const sortKeys = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(sortKeys);
    if (node && typeof node === 'object') {
      return Object.fromEntries(
        Object.keys(node as Record<string, unknown>)
          .sort()
          .map((key) => [
            key,
            sortKeys((node as Record<string, unknown>)[key]),
          ]),
      );
    }
    return node;
  };
  return `${JSON.stringify(sortKeys(value), null, 2)}\n`;
}

/** `{ 'build/resolution/foo.notation.json': '…', … }` — the full expected tree. */
export function buildResolutionReports(
  manifest: Manifest,
): Map<string, string> {
  const files = new Map<string, string>();

  const localKeysByLesson = new Map<string, string[]>();
  for (const definition of manifest.notation.definitions) {
    if (definition.kind !== 'local') continue;
    const list = localKeysByLesson.get(definition.lessonId) ?? [];
    list.push(definition.key);
    localKeysByLesson.set(definition.lessonId, list);
  }

  for (const lesson of manifest.lessons) {
    files.set(
      `${RESOLUTION_PREFIX}${lesson.id}.notation.json`,
      stableJson({
        schemaVersion: MANIFEST_SCHEMA_VERSION,
        lesson: lesson.id,
        file: lesson.file,
        localKeys: [...(localKeysByLesson.get(lesson.id) ?? [])].sort(),
        references: lesson.notation.resolution,
      }),
    );
  }

  files.set(
    `${RESOLUTION_PREFIX}${CONSISTENCY_FILE}`,
    stableJson({
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      generatedBy: 'pnpm validate:content',
      counts: consistencyCounts(manifest.diagnostics.consistency),
      diagnostics: manifest.diagnostics
        .consistency as readonly ConsistencyDiagnostic[],
    }),
  );

  return files;
}

export interface ResolutionReportSync {
  readonly written: number;
  /** Repo-relative paths that were out of date (created, changed, or removed). */
  readonly stale: readonly string[];
}

/**
 * Write every expected report and prune orphans. Returns the paths that did not
 * already match on disk — the caller turns a non-empty list into a build
 * failure so the checked-in reports stay honest.
 */
export function syncResolutionReports(
  manifest: Manifest,
): ResolutionReportSync {
  const expected = buildResolutionReports(manifest);
  mkdirSync(RESOLUTION_DIR, { recursive: true });

  const onDisk = new Set(
    existsSync(RESOLUTION_DIR)
      ? readdirSync(RESOLUTION_DIR).filter((name) => name.endsWith('.json'))
      : [],
  );
  const stale: string[] = [];

  for (const [relPath, content] of [...expected].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const name = relPath.slice(RESOLUTION_PREFIX.length);
    const absolute = join(RESOLUTION_DIR, name);
    onDisk.delete(name);
    const current = existsSync(absolute)
      ? readFileSync(absolute, 'utf8')
      : undefined;
    if (current !== content) {
      writeFileSync(absolute, content);
      stale.push(
        `${relPath} (${current === undefined ? 'missing' : 'changed'})`,
      );
    }
  }

  for (const orphan of [...onDisk].sort()) {
    rmSync(join(RESOLUTION_DIR, orphan));
    stale.push(`${RESOLUTION_PREFIX}${orphan} (stale, removed)`);
  }

  return { written: expected.size, stale };
}

export { RESOLUTION_DIR };
