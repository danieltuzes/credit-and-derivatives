import { describe, expect, it } from 'vitest';

import { loadNotationRegistryInput } from 'explico/compiler/collections';
import {
  formulaGlyphScope,
  unknownFormulaScopeKeys,
} from 'explico/reference/gloss';
import type { GlyphScopeEntry } from 'explico/reference/gloss';
import {
  resolveMathGlyphs,
  GlyphResolutionError,
} from 'explico/reference/math-glyphs.mjs';

/**
 * A card's `formula` is now rendered with live glyphs (D15), so every symbol in
 * it must resolve against the **entry-scoped** table — the card, its
 * `glosses:`, and any card the formula names with `\explain{key}{latex}`.
 *
 * The completeness gate reports `formula` findings at Tier 3, and the render
 * path degrades an unresolved glyph to an inert one rather than failing, so
 * neither would stop a regression reaching `dist/`. This test holds the corpus
 * at zero the way `notation-entry-body-math.test.ts` does for entry bodies.
 */
describe('shared notation entry formula math', () => {
  it('every content/notation/*.md formula resolves against its entry scope', async () => {
    const { sharedDefinitions } = await loadNotationRegistryInput();
    const cardsByKey = new Map<string, GlyphScopeEntry>(
      sharedDefinitions.map((definition) => [
        definition.key,
        { key: definition.key, notation: definition.notation },
      ]),
    );

    const failures: string[] = [];
    for (const definition of sharedDefinitions) {
      if (!definition.formula) continue;
      const scope = formulaGlyphScope({
        key: definition.key,
        notation: definition.notation,
        formula: definition.formula,
        glosses: definition.glosses,
        cardsByKey,
      });

      try {
        const result = resolveMathGlyphs(definition.formula, scope);
        for (const { token } of result.unresolved) {
          failures.push(
            `${definition.key}: unresolved "${token}" in formula ${JSON.stringify(definition.formula)}`,
          );
        }
      } catch (error) {
        failures.push(
          `${definition.key}: ${
            error instanceof GlyphResolutionError
              ? error.message
              : String(error)
          }`,
        );
      }
    }

    expect(failures).toEqual([]);
  });

  it('no formula names a notation key that does not exist', async () => {
    const { sharedDefinitions } = await loadNotationRegistryInput();
    const cardKeys = new Set(
      sharedDefinitions.map((definition) => definition.key),
    );

    const unknown = sharedDefinitions.flatMap((definition) =>
      unknownFormulaScopeKeys(
        definition.formula,
        new Set(definition.glosses.map((gloss) => gloss.key)),
        cardKeys,
      ).map((key) => `${definition.key} -> ${key}`),
    );

    expect(unknown).toEqual([]);
  });

  it('no derived gloss key collides with a card key', async () => {
    const { sharedDefinitions } = await loadNotationRegistryInput();
    const cardKeys = new Set(
      sharedDefinitions.map((definition) => definition.key),
    );

    const collisions = sharedDefinitions.flatMap((definition) =>
      definition.glosses
        .filter((gloss) => cardKeys.has(gloss.key))
        .map((gloss) => `${definition.key}: ${gloss.key}`),
    );

    expect(collisions).toEqual([]);
  });
});
