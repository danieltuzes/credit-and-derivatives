import { loadNotationRegistryInput } from '../../scripts/notation-files';
import type { LabMathScopeDefinition } from './render-lab-math';

interface LessonNotationFrontmatter {
  readonly uses?: readonly string[];
  readonly local?: ReadonlyArray<{
    readonly key: string;
    readonly notation: string;
  }>;
}

/**
 * The notation a lab's math template may reference: exactly the same direct
 * scope the remark adapter gives lesson `$$` math — this page's
 * `notation.local` plus the shared entries it imports through `notation.uses`.
 * No transitive closure, so island math cannot quietly reach beyond what the
 * lesson declares.
 */
export async function labMathScope(
  notation: LessonNotationFrontmatter | undefined,
): Promise<LabMathScopeDefinition[]> {
  const uses = notation?.uses ?? [];
  const local = notation?.local ?? [];

  const { sharedDefinitions } = await loadNotationRegistryInput();
  const sharedByKey = new Map(
    sharedDefinitions.map((definition) => [definition.key, definition]),
  );

  const scope: LabMathScopeDefinition[] = local.map((definition) => ({
    key: definition.key,
    notation: definition.notation,
  }));

  for (const key of uses) {
    const shared = sharedByKey.get(key);
    if (shared) scope.push({ key: shared.key, notation: shared.notation });
  }

  return scope;
}
