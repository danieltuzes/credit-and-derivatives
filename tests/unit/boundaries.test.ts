/**
 * Dependency-boundary tests (Phase F).
 *
 * The repo is split into an engine (`src/`) and a course (`content/`):
 *
 *   - `core-not-course` — no engine module imports the course. Only the two
 *     wiring files (`src/content.config.ts`, `astro.config.mjs`) name `content/`.
 *   - `domain-pure` — `content/domain/**` (the course's math) imports nothing
 *     but its own siblings: no engine, no React, no Astro, no browser API.
 *   - `course.config` is a plain data module — zero imports.
 *
 * These lock the split so a second course is a new `content/` folder, not a
 * detangle of the engine.
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

describe('core-not-course', () => {
  const engineDirs = [
    'reference',
    'curriculum',
    'compiler',
    'components',
    'progress',
    'session',
    'analytics',
  ];

  it('no engine module statically imports from content/', () => {
    const offenders: string[] = [];
    for (const dir of engineDirs) {
      for (const path of filesUnder(join(ROOT, 'src', dir), CODE)) {
        for (const specifier of importSpecifiers(readFileSync(path, 'utf8'))) {
          // A specifier reaching the course tree: `../content/…`,
          // `../../content/…`, or an absolute-ish `content/…`.
          if (/(^|\/)content\//.test(specifier)) {
            offenders.push(`${relative(ROOT, path)} → ${specifier}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('only the sanctioned wiring files import from content/', () => {
    // The wiring layer may import the course config. `src/content.config.ts`
    // names `content/` only as loader `base:` strings (data, not a code
    // import), so in practice the sole import edge is astro.config.mjs.
    const allowed = new Set(['src/content.config.ts', 'astro.config.mjs']);
    const importers: string[] = [];
    for (const path of [
      ...filesUnder(join(ROOT, 'src'), CODE),
      join(ROOT, 'astro.config.mjs'),
    ]) {
      const importsCourse = importSpecifiers(readFileSync(path, 'utf8')).some(
        (s) => /(^|\/)content\//.test(s) || s.endsWith('/course.config'),
      );
      if (importsCourse) importers.push(relative(ROOT, path));
    }
    expect(importers.filter((f) => !allowed.has(f))).toEqual([]);
    expect(importers).toContain('astro.config.mjs');
  });
});

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
