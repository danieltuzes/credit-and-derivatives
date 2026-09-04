/**
 * The one reviewed suppression registry for consistency checks (Step D6).
 *
 * A corpus-level finding (a glyph that resolves to more than one meaning, a
 * unit outside the controlled vocabulary, …) is a violation unless it is
 * acknowledged here, in `lint-ignore.yml` at the repository root, with a
 * reason. Silent suppression is disallowed: there is no per-file pragma and no
 * inline comment that turns a check off.
 *
 * File grammar — one acknowledgement per line:
 *
 *     <check-code>[:<detail>] — <reason>
 *
 * `<detail>` is optional and narrows the acknowledgement (a glyph for
 * `glyph-unique-in-corpus`, a notation key otherwise); with no detail the line
 * acknowledges every finding of that code. The separator is an em dash (`—`),
 * or `--` / ` - ` in ASCII. Blank lines and `#` comments are ignored.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const IGNORE_PATH = join(process.cwd(), 'lint-ignore.yml');

export interface LintIgnoreEntry {
  readonly code: string;
  readonly detail?: string;
  readonly reason: string;
}

export interface LintIgnore {
  readonly entries: readonly LintIgnoreEntry[];
  /** True when a `<code>` (optionally `<code>:<detail>`) finding is acknowledged. */
  matches(code: string, detail?: string): boolean;
}

const LINE =
  /^-\s*([a-z0-9-]+)(?::([^\s—-][^—-]*?))?\s*(?:—|--|\s-\s)\s*(.+?)\s*$/;

export function parseLintIgnore(text: string): LintIgnoreEntry[] {
  const entries: LintIgnoreEntry[] = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (line === '' || line === 'ignore:' || line === '[]') continue;
    const match = LINE.exec(line);
    if (!match) {
      throw new Error(
        `lint-ignore.yml: expected "- <code>[:<detail>] — <reason>", got ${JSON.stringify(rawLine)}`,
      );
    }
    const [, code, detail, reason] = match;
    entries.push({
      code: code as string,
      ...(detail && detail.trim() ? { detail: detail.trim() } : {}),
      reason: (reason as string).trim(),
    });
  }
  return entries;
}

export function loadLintIgnore(): LintIgnore {
  const entries = existsSync(IGNORE_PATH)
    ? parseLintIgnore(readFileSync(IGNORE_PATH, 'utf8'))
    : [];
  return {
    entries,
    matches(code, detail) {
      return entries.some(
        (entry) =>
          entry.code === code &&
          (entry.detail === undefined || entry.detail === detail),
      );
    },
  };
}
