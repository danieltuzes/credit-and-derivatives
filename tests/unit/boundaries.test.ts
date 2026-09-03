/**
 * Dependency-boundary tests (Phase F).
 *
 * The repo is split into an engine (`packages/legend/`, the `@danieltuzes/legend`
 * workspace package) and a course (`content/` + `astro.config.mjs` + `scripts/`):
 *
 *   - `core-not-course` — no engine module imports the course: not `content/…`,
 *     not the course package. The engine reaches the content tree only through
 *     `contentDir` conventions resolved at run time (loader `base:` strings and
 *     `join(process.cwd(), 'content')`), never an import.
 *   - `domain-pure` — `content/domain/**` (the course's math) imports nothing
 *     but its own siblings: no engine, no React, no Astro, no browser API.
 *   - `course.config` is a plain data module — zero imports.
 *   - `content.config` (the course's Astro entry) only re-exports the engine.
 *
 * These lock the split so a second course is a new `content/` + `course.config`
 * against the published engine, not a detangle. (When the two halves become
 * separate repos, `core-not-course` follows the engine and `domain-pure` the
 * course.)
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const ENGINE_SRC = join(ROOT, 'packages', 'legend', 'src');

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

/** A specifier that reaches the course: `content/…` or the course package. */
function reachesCourse(specifier: string): boolean {
  return (
    /(^|\/)content\//.test(specifier) ||
    specifier === 'credit-and-derivatives' ||
    specifier.startsWith('credit-and-derivatives/') ||
    specifier.endsWith('/course.config')
  );
}

describe('core-not-course', () => {
  it('no engine module imports the course', () => {
    const offenders: string[] = [];
    for (const path of filesUnder(ENGINE_SRC, CODE)) {
      for (const specifier of importSpecifiers(readFileSync(path, 'utf8'))) {
        if (reachesCourse(specifier)) {
          offenders.push(`${relative(ROOT, path)} → ${specifier}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('every non-relative engine import is a declared peer dependency', () => {
    const enginePkg = JSON.parse(
      readFileSync(join(ROOT, 'packages', 'legend', 'package.json'), 'utf8'),
    ) as { peerDependencies?: Record<string, string> };
    const declared = new Set(Object.keys(enginePkg.peerDependencies ?? {}));
    const offenders: string[] = [];
    for (const path of filesUnder(ENGINE_SRC, CODE)) {
      for (const specifier of importSpecifiers(readFileSync(path, 'utf8'))) {
        // Skip relative imports and anything that is not a plausible module
        // specifier (the loose regex also catches `from '` inside data strings).
        if (specifier.startsWith('.') || specifier.startsWith('node:'))
          continue;
        if (
          !/^(@[a-z0-9-]+\/)?[a-z0-9][a-z0-9._-]*(\/[\w.-]+)*$/i.test(specifier)
        )
          continue;
        if (specifier === 'astro:content') continue;
        const pkg = specifier.startsWith('@')
          ? specifier.split('/').slice(0, 2).join('/')
          : specifier.split('/')[0];
        if (declared.has(pkg)) continue;
        offenders.push(`${relative(ROOT, path)} → ${specifier}`);
      }
    }
    expect(offenders).toEqual([]);
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

describe('content.config', () => {
  it('only re-exports the engine', () => {
    const source = readFileSync(join(ROOT, 'src', 'content.config.ts'), 'utf8');
    for (const specifier of importSpecifiers(source)) {
      expect(specifier).toBe('@danieltuzes/legend/content-config');
    }
  });
});
