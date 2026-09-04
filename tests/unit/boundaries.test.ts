/**
 * Dependency-boundary tests (Phase F).
 *
 * The build-time engine lives in its own package, `explico` (repo
 * `danieltuzes/explico`); this repo is the course — `content/`,
 * `astro.config.mjs`, `scripts/` — and depends on it as a published version.
 * These tests lock the course side of that seam so a second course is a new
 * `content/` + `course.config` against the engine, not a detangle:
 *
 *   - `domain-pure` — `content/domain/**` (the course's math) imports nothing
 *     but its own siblings: no engine, no React, no Astro, no browser API.
 *   - `course.config` is a plain data module — zero imports.
 *   - `content.config` (the course's Astro entry) only re-exports the engine.
 *
 * The mirror-image checks — no engine module imports a course, every engine
 * import is a declared peer dependency — live in the `explico` repo.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function filesUnder(dir: string, exts: readonly string[]): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(path, exts);
    return entry.isFile() && exts.some((e) => entry.name.endsWith(e))
      ? [path]
      : [];
  });
}

/** Every `from '…'` / `import('…')` / `require('…')` string-literal specifier. */
function importSpecifiers(source: string): string[] {
  const out: string[] = [];
  const patterns = [
    /\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source))) out.push(match[1]);
  }
  return out;
}

const CODE = ['.ts', '.tsx', '.mjs', '.astro'] as const;

describe('domain-pure', () => {
  const domainRoot = join(ROOT, 'content', 'domain');

  it('content/domain imports only its own siblings', () => {
    const offenders: string[] = [];
    for (const path of filesUnder(domainRoot, CODE)) {
      for (const specifier of importSpecifiers(readFileSync(path, 'utf8'))) {
        const isLocal =
          specifier.startsWith('./') || specifier.startsWith('../');
        if (!isLocal) {
          offenders.push(`${relative(ROOT, path)} → ${specifier}`);
          continue;
        }
        const resolved = relative(domainRoot, join(path, '..', specifier));
        if (resolved.startsWith('..')) {
          offenders.push(
            `${relative(ROOT, path)} → ${specifier} (escapes domain/)`,
          );
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('content/domain touches no framework or browser API', () => {
    for (const path of filesUnder(domainRoot, CODE)) {
      const source = readFileSync(path, 'utf8');
      expect(source, relative(ROOT, path)).not.toMatch(
        /from ['"](react|astro|astro:)/,
      );
      expect(source, relative(ROOT, path)).not.toMatch(
        /\b(window|document|localStorage|sessionStorage)\s*[.[]/,
      );
    }
  });
});

describe('course.config', () => {
  it('is a plain data module with no imports', () => {
    const source = readFileSync(
      join(ROOT, 'content', 'course.config.ts'),
      'utf8',
    );
    expect(importSpecifiers(source)).toEqual([]);
  });
});

describe('content.config', () => {
  it('only re-exports the engine', () => {
    const source = readFileSync(join(ROOT, 'src', 'content.config.ts'), 'utf8');
    for (const specifier of importSpecifiers(source)) {
      expect(specifier).toBe('explico/content-config');
    }
  });
});
