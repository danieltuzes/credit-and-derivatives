import { loadNotationRegistryInput } from '../content/collections';
import type { LabMathScopeDefinition } from './render-lab-math';

interface LessonNotationFrontmatter {
  readonly local?: ReadonlyArray<{
    readonly key: string;
    readonly latex: string;
  }>;
}

const TERM_KEY = /\[\[\s*([a-z0-9]+(?:[.-][a-z0-9]+)*)\s*\]\]/g;
const EXPLAIN_KEY = /\\explain\s*\{([a-z0-9]+(?:[.-][a-z0-9]+)*)\}/g;

/**
 * The notation a lab's math template may reference: exactly the same page glyph
 * scope the remark adapter gives lesson `$$` math — this page's
 * `notation.local` plus the shared entries it names in the body with `[[key]]`
 * (or `\explain{key}{…}`). No transitive closure, so island math cannot
 * quietly reach beyond what the lesson introduces.
 */
export async function labMathScope(
  notation: LessonNotationFrontmatter | undefined,
  body = '',
): Promise<LabMathScopeDefinition[]> {
  const local = notation?.local ?? [];
  const scope: LabMathScopeDefinition[] = local.map((definition) => ({
    key: definition.key,
    notation: definition.latex,
  }));

  const referenced = new Set<string>();
  for (const pattern of [TERM_KEY, EXPLAIN_KEY]) {
    for (const match of body.matchAll(pattern)) referenced.add(match[1]);
  }

  const localKeys = new Set(local.map((definition) => definition.key));
  const { sharedDefinitions } = await loadNotationRegistryInput();
  const sharedByKey = new Map(
    sharedDefinitions.map((definition) => [definition.key, definition]),
  );

  for (const key of referenced) {
    if (localKeys.has(key)) continue;
    const shared = sharedByKey.get(key);
    if (shared) scope.push({ key: shared.key, notation: shared.notation });
  }

  return scope;
}
