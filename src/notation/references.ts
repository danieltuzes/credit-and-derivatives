import type {
  NotationDefinitionScope,
  NotationDiagnostic,
  SourceSpan,
} from './types';

export const NOTATION_KEY_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

export function isNotationKey(value: string): boolean {
  return NOTATION_KEY_PATTERN.test(value);
}

export function sharedDefinitionId(key: string): string {
  return `shared:${key}`;
}

export function localDefinitionId(lessonId: string, key: string): string {
  return `page:${lessonId}:${key}`;
}

export function definitionId(
  scope: NotationDefinitionScope,
  key: string,
): string {
  return scope.kind === 'shared'
    ? sharedDefinitionId(key)
    : localDefinitionId(scope.lessonId, key);
}

/**
 * Resolve by lexical scope. Page content and page-local definition bodies see
 * local definitions first, then shared definitions. Shared definition bodies
 * can only see shared definitions, so their meaning cannot change by caller.
 */
export function resolveReferenceId(
  key: string,
  scope: NotationDefinitionScope,
  availableDefinitionIds: ReadonlySet<string>,
): string | undefined {
  if (scope.kind === 'page') {
    const localId = localDefinitionId(scope.lessonId, key);
    if (availableDefinitionIds.has(localId)) return localId;
  }

  const sharedId = sharedDefinitionId(key);
  return availableDefinitionIds.has(sharedId) ? sharedId : undefined;
}

export function compareSourceSpans(
  left: SourceSpan | undefined,
  right: SourceSpan | undefined,
): number {
  if (left === undefined) return right === undefined ? 0 : 1;
  if (right === undefined) return -1;

  return (
    left.file.localeCompare(right.file) ||
    (left.line ?? 0) - (right.line ?? 0) ||
    (left.column ?? 0) - (right.column ?? 0) ||
    (left.endLine ?? 0) - (right.endLine ?? 0) ||
    (left.endColumn ?? 0) - (right.endColumn ?? 0)
  );
}

export function compareDiagnostics(
  left: NotationDiagnostic,
  right: NotationDiagnostic,
): number {
  return (
    severityRank(left.severity) - severityRank(right.severity) ||
    left.code.localeCompare(right.code) ||
    (left.lessonId ?? '').localeCompare(right.lessonId ?? '') ||
    (left.key ?? '').localeCompare(right.key ?? '') ||
    (left.definitionId ?? '').localeCompare(right.definitionId ?? '') ||
    compareSourceSpans(left.source, right.source) ||
    left.message.localeCompare(right.message)
  );
}

function severityRank(severity: NotationDiagnostic['severity']): number {
  return severity === 'error' ? 0 : 1;
}
