import { describe, expect, it } from 'vitest';

import { loadNotationRegistryInput } from 'explico/compiler/collections';
import {
  resolveMathGlyphs,
  GlyphResolutionError,
} from 'explico/reference/math-glyphs.mjs';
import { stripEquationLabels } from 'explico/reference/equations.mjs';

/**
 * `remark-notation` resolves the worked math in every shared `content/notation/*.md`
 * body against the whole registry at render time, but a failure there is only a
 * non-fatal `[glob-loader] Error rendering` in `astro build`. This test makes the
 * same resolution a hard check so a broken entry body fails CI, not just a
 * cache-cold dev render.
 */

const DISPLAY_MATH = /\$\$([\s\S]+?)\$\$/g;
const INLINE_MATH = /(?<![\\$])\$(?!\s)([^$\n]+?)(?<![\\\s])\$(?!\d)/g;

function stripCode(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^`])`[^`\n]*`/g, (match) => match.replace(/[^\n]/g, ' '));
}

function mathSpans(body: string): string[] {
  const searchable = stripCode(body);
  const spans: string[] = [];
  for (const pattern of [DISPLAY_MATH, INLINE_MATH]) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(searchable))) {
      spans.push(stripEquationLabels(match[1] ?? ''));
    }
  }
  return spans;
}

describe('shared notation entry body math', () => {
  it('every $…$ / $$…$$ in a content/notation/*.md body resolves against the registry', async () => {
    const { sharedDefinitions } = await loadNotationRegistryInput();
    const registryScope = sharedDefinitions.map((definition) => ({
      key: definition.key,
      notation: definition.notation,
    }));

    const failures: string[] = [];
    for (const definition of sharedDefinitions) {
      for (const latex of mathSpans(definition.body)) {
        try {
          const result = resolveMathGlyphs(latex, registryScope);
          for (const { token } of result.unresolved) {
            failures.push(
              `${definition.key}: unresolved "${token}" in ${JSON.stringify(latex)}`,
            );
          }
        } catch (error) {
          const message =
            error instanceof GlyphResolutionError
              ? error.message
              : String(error);
          failures.push(
            `${definition.key}: ${message} in ${JSON.stringify(latex)}`,
          );
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
