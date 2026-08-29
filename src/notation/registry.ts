import {
  compareDiagnostics,
  compareSourceSpans,
  isNotationKey,
  localDefinitionId,
  resolveReferenceId,
  sharedDefinitionId,
} from './references';
import type {
  LocalNotationDefinitionInput,
  LocalNotationDefinitionRecord,
  NotationBacklink,
  NotationDefinitionRecord,
  NotationDefinitionScope,
  NotationDiagnostic,
  NotationLessonInput,
  NotationPageBundle,
  NotationReferenceInput,
  NotationRegistry,
  NotationRegistryInput,
  ResolvedNotationReference,
  SharedNotationDefinitionInput,
  SharedNotationDefinitionRecord,
  SourceSpan,
} from './types';

interface SharedCandidate {
  readonly kind: 'shared';
  readonly id: string;
  readonly scope: { readonly kind: 'shared' };
  readonly input: SharedNotationDefinitionInput;
  resolvedReferences: readonly ResolvedNotationReference[];
}

interface LocalCandidate {
  readonly kind: 'local';
  readonly id: string;
  readonly scope: {
    readonly kind: 'page';
    readonly lessonId: string;
  };
  readonly lesson: NotationLessonInput;
  readonly input: LocalNotationDefinitionInput;
  resolvedReferences: readonly ResolvedNotationReference[];
}

type DefinitionCandidate = SharedCandidate | LocalCandidate;

export function buildNotationRegistry(
  rawInput: NotationRegistryInput,
): NotationRegistry {
  const diagnostics: NotationDiagnostic[] = [];
  const lessons = buildLessonIndex(rawInput.lessons, diagnostics);
  const definitions = buildDefinitionIndex(
    rawInput.sharedDefinitions,
    lessons,
    diagnostics,
  );
  const availableDefinitionIds = new Set(definitions.keys());

  const declaredUses = new Map<string, Set<string>>();
  const unresolvedUses = new Map<string, Set<string>>();
  const usedDeclarations = new Map<string, Set<string>>();

  for (const lesson of lessons.values()) {
    const declared = new Set<string>();
    const unresolved = new Set<string>();
    const used = new Set<string>();
    declaredUses.set(lesson.lessonId, declared);
    unresolvedUses.set(lesson.lessonId, unresolved);
    usedDeclarations.set(lesson.lessonId, used);

    for (const key of [...lesson.uses].sort()) {
      if (!isNotationKey(key)) {
        diagnostics.push(
          diagnostic({
            code: 'invalid-key',
            message: `${lesson.lessonId} declares invalid notation key ${JSON.stringify(key)}`,
            key,
            lessonId: lesson.lessonId,
            source: lesson.source,
          }),
        );
        continue;
      }
      if (declared.has(key)) {
        diagnostics.push(
          diagnostic({
            code: 'duplicate-use',
            message: `${lesson.lessonId} repeats notation use ${key}`,
            key,
            lessonId: lesson.lessonId,
            source: lesson.source,
          }),
        );
        continue;
      }
      declared.add(key);

      // `uses` imports shared definitions. Page-local definitions are already
      // in lexical scope and must not be repeated in this list.
      if (!availableDefinitionIds.has(sharedDefinitionId(key))) {
        unresolved.add(key);
        diagnostics.push(
          diagnostic({
            code: 'undefined-reference',
            message: `${lesson.lessonId} declares unknown notation use ${key}`,
            key,
            lessonId: lesson.lessonId,
            source: lesson.source,
          }),
        );
      }
    }
  }

  for (const candidate of definitions.values()) {
    const references = sortedReferences(candidate.input.references);
    const resolved: ResolvedNotationReference[] = [];
    for (const reference of references) {
      if (!validateReferenceKey(reference, candidate, diagnostics)) continue;

      if (candidate.kind === 'local') {
        const lessonId = candidate.lesson.lessonId;
        const definitionId = resolveReferenceId(
          reference.key,
          candidate.scope,
          availableDefinitionIds,
        );
        if (definitionId === undefined) {
          diagnostics.push(
            diagnostic({
              code: 'undefined-reference',
              message: `${candidate.id} references unknown notation ${reference.key}`,
              key: reference.key,
              lessonId,
              definitionId: candidate.id,
              source: reference.source,
            }),
          );
          continue;
        }

        const resolvesLocally = definitionId.startsWith(`page:${lessonId}:`);
        const declared = declaredUses.get(lessonId) ?? new Set<string>();
        if (!resolvesLocally && !declared.has(reference.key)) {
          diagnostics.push(
            diagnostic({
              code: 'undeclared-reference',
              message: `${lessonId} local definition ${candidate.input.key} references undeclared notation ${reference.key}`,
              key: reference.key,
              lessonId,
              definitionId: candidate.id,
              source: reference.source,
            }),
          );
          continue;
        }
        if (!resolvesLocally) {
          usedDeclarations.get(lessonId)?.add(reference.key);
        }

        resolved.push({ ...reference, definitionId });
        continue;
      }

      const definitionId = resolveReferenceId(
        reference.key,
        candidate.scope,
        availableDefinitionIds,
      );
      if (definitionId === undefined) {
        diagnostics.push(
          diagnostic({
            code: 'undefined-reference',
            message: `${candidate.id} references unknown notation ${reference.key}`,
            key: reference.key,
            definitionId: candidate.id,
            source: reference.source,
          }),
        );
        continue;
      }
      resolved.push({ ...reference, definitionId });
    }
    candidate.resolvedReferences = sortResolvedReferences(resolved);
    validateSeeAlsoReferences(
      candidate,
      availableDefinitionIds,
      declaredUses,
      usedDeclarations,
      diagnostics,
    );
  }

  const directReferences = new Map<string, ResolvedNotationReference[]>();
  for (const lesson of lessons.values()) {
    const resolved: ResolvedNotationReference[] = [];
    const scope: NotationDefinitionScope = {
      kind: 'page',
      lessonId: lesson.lessonId,
    };
    const declared = declaredUses.get(lesson.lessonId) ?? new Set<string>();

    for (const reference of sortedReferences(lesson.references)) {
      if (!validatePageReferenceKey(reference, lesson, diagnostics)) continue;
      const definitionId = resolveReferenceId(
        reference.key,
        scope,
        availableDefinitionIds,
      );
      if (definitionId === undefined) {
        if (!unresolvedUses.get(lesson.lessonId)?.has(reference.key)) {
          diagnostics.push(
            diagnostic({
              code: 'undefined-reference',
              message: `${lesson.lessonId} references unknown notation ${reference.key}`,
              key: reference.key,
              lessonId: lesson.lessonId,
              source: reference.source,
            }),
          );
        }
        continue;
      }

      const resolvesLocally = definitionId.startsWith(
        `page:${lesson.lessonId}:`,
      );
      if (!resolvesLocally && !declared.has(reference.key)) {
        diagnostics.push(
          diagnostic({
            code: 'undeclared-reference',
            message: `${lesson.lessonId} references undeclared notation ${reference.key}`,
            key: reference.key,
            lessonId: lesson.lessonId,
            source: reference.source,
          }),
        );
        continue;
      }
      if (!resolvesLocally) {
        usedDeclarations.get(lesson.lessonId)?.add(reference.key);
      }
      resolved.push({ ...reference, definitionId });
    }
    directReferences.set(lesson.lessonId, sortResolvedReferences(resolved));
  }

  const edgeIndex = new Map<string, readonly string[]>();
  for (const candidate of definitions.values()) {
    edgeIndex.set(
      candidate.id,
      uniqueSorted(
        candidate.resolvedReferences.map((reference) => reference.definitionId),
      ),
    );
  }
  detectCycles(definitions, edgeIndex, diagnostics);

  const bundles: NotationPageBundle[] = [];
  const backlinks: NotationBacklink[] = [];
  const reachableDefinitions = new Set<string>();

  for (const lesson of lessons.values()) {
    const references = directReferences.get(lesson.lessonId) ?? [];
    const directIds = new Set(
      references.map((reference) => reference.definitionId),
    );
    const definitionIds = transitiveClosure(directIds, edgeIndex);
    for (const id of definitionIds) reachableDefinitions.add(id);

    const bindingByKey = new Map<string, string>();
    for (const reference of references) {
      bindingByKey.set(reference.key, reference.definitionId);
    }

    bundles.push({
      lessonId: lesson.lessonId,
      status: lesson.status,
      source: lesson.source,
      declaredUses: uniqueSorted([
        ...(declaredUses.get(lesson.lessonId) ?? []),
      ]),
      bindings: [...bindingByKey]
        .map(([key, definitionId]) => ({ key, definitionId }))
        .sort(
          (left, right) =>
            left.key.localeCompare(right.key) ||
            left.definitionId.localeCompare(right.definitionId),
        ),
      definitionIds,
    });

    for (const definitionId of definitionIds) {
      const definition = definitions.get(definitionId);
      if (definition === undefined) continue;
      backlinks.push({
        definitionId,
        key: definition.input.key,
        lessonId: lesson.lessonId,
        direct: directIds.has(definitionId),
      });
    }
  }

  for (const candidate of definitions.values()) {
    if (!reachableDefinitions.has(candidate.id)) {
      diagnostics.push({
        code: 'unused-definition',
        severity: 'warning',
        message: `${candidate.id} is not reachable from any lesson reference`,
        key: candidate.input.key,
        lessonId:
          candidate.kind === 'local' ? candidate.lesson.lessonId : undefined,
        definitionId: candidate.id,
        source: candidate.input.source,
      });
    }
  }

  for (const lesson of lessons.values()) {
    const used = usedDeclarations.get(lesson.lessonId) ?? new Set<string>();
    for (const key of declaredUses.get(lesson.lessonId) ?? []) {
      if (!used.has(key)) {
        diagnostics.push({
          code: 'unused-use',
          severity: 'warning',
          message: `${lesson.lessonId} declares notation ${key} but never references it`,
          key,
          lessonId: lesson.lessonId,
          source: lesson.source,
        });
      }
    }
  }

  return {
    definitions: [...definitions.values()]
      .map(toDefinitionRecord)
      .sort((left, right) => left.id.localeCompare(right.id)),
    bundles: bundles.sort((left, right) =>
      left.lessonId.localeCompare(right.lessonId),
    ),
    backlinks: backlinks.sort(
      (left, right) =>
        left.definitionId.localeCompare(right.definitionId) ||
        left.lessonId.localeCompare(right.lessonId) ||
        Number(right.direct) - Number(left.direct),
    ),
    diagnostics: diagnostics.sort(compareDiagnostics),
  };
}

export function assertValidNotation(registry: NotationRegistry): void {
  const errors = registry.diagnostics.filter(
    (item) => item.severity === 'error',
  );
  if (errors.length === 0) return;

  throw new Error(
    `Invalid notation registry:\n${errors
      .map((item) => `- [${item.code}] ${item.message}`)
      .join('\n')}`,
  );
}

function buildLessonIndex(
  rawLessons: readonly NotationLessonInput[],
  diagnostics: NotationDiagnostic[],
): Map<string, NotationLessonInput> {
  const lessons = new Map<string, NotationLessonInput>();
  const sorted = [...rawLessons].sort(
    (left, right) =>
      left.lessonId.localeCompare(right.lessonId) ||
      compareSourceSpans(left.source, right.source),
  );

  for (const rawLesson of sorted) {
    const lesson = normalizeLesson(rawLesson);
    if (!isNotationKey(lesson.lessonId)) {
      diagnostics.push(
        diagnostic({
          code: 'invalid-key',
          message: `lesson has invalid id ${JSON.stringify(lesson.lessonId)}`,
          key: lesson.lessonId,
          lessonId: lesson.lessonId,
          source: lesson.source,
        }),
      );
      continue;
    }
    const previous = lessons.get(lesson.lessonId);
    if (previous !== undefined) {
      diagnostics.push(
        diagnostic({
          code: 'duplicate-page',
          message: `duplicate notation lesson ${lesson.lessonId}`,
          lessonId: lesson.lessonId,
          source: lesson.source,
          relatedSources: sortedSources([previous.source, lesson.source]),
        }),
      );
      continue;
    }
    lessons.set(lesson.lessonId, lesson);
  }
  return lessons;
}

function buildDefinitionIndex(
  rawShared: readonly SharedNotationDefinitionInput[],
  lessons: ReadonlyMap<string, NotationLessonInput>,
  diagnostics: NotationDiagnostic[],
): Map<string, DefinitionCandidate> {
  const candidates: DefinitionCandidate[] = [
    ...rawShared.map((raw): SharedCandidate => {
      const input = normalizeSharedDefinition(raw);
      return {
        kind: 'shared',
        id: sharedDefinitionId(input.key),
        scope: { kind: 'shared' },
        input,
        resolvedReferences: [],
      };
    }),
    ...[...lessons.values()].flatMap((lesson) =>
      lesson.localDefinitions.map((input): LocalCandidate => ({
        kind: 'local',
        id: localDefinitionId(lesson.lessonId, input.key),
        scope: { kind: 'page', lessonId: lesson.lessonId },
        lesson,
        input,
        resolvedReferences: [],
      })),
    ),
  ].sort(
    (left, right) =>
      left.id.localeCompare(right.id) ||
      compareSourceSpans(left.input.source, right.input.source),
  );

  const definitions = new Map<string, DefinitionCandidate>();
  for (const candidate of candidates) {
    if (!isNotationKey(candidate.input.key)) {
      diagnostics.push(
        diagnostic({
          code: 'invalid-key',
          message: `${candidate.id} has invalid notation key ${JSON.stringify(candidate.input.key)}`,
          key: candidate.input.key,
          lessonId:
            candidate.kind === 'local' ? candidate.lesson.lessonId : undefined,
          definitionId: candidate.id,
          source: candidate.input.source,
        }),
      );
      continue;
    }

    const previous = definitions.get(candidate.id);
    if (previous === undefined) {
      definitions.set(candidate.id, candidate);
      continue;
    }

    const duplicate =
      definitionFingerprint(previous) === definitionFingerprint(candidate);
    diagnostics.push(
      diagnostic({
        code: duplicate ? 'duplicate-definition' : 'conflicting-definition',
        message: duplicate
          ? `${candidate.id} is declared more than once`
          : `${candidate.id} has conflicting declarations`,
        key: candidate.input.key,
        lessonId:
          candidate.kind === 'local' ? candidate.lesson.lessonId : undefined,
        definitionId: candidate.id,
        source: candidate.input.source,
        relatedSources: sortedSources([
          previous.input.source,
          candidate.input.source,
        ]),
      }),
    );
  }
  return definitions;
}

function normalizeLesson(lesson: NotationLessonInput): NotationLessonInput {
  return {
    ...lesson,
    uses: [...lesson.uses].sort(),
    localDefinitions: lesson.localDefinitions
      .map(normalizeLocalDefinition)
      .sort(
        (left, right) =>
          left.key.localeCompare(right.key) ||
          compareSourceSpans(left.source, right.source),
      ),
    references: sortedReferences(lesson.references),
  };
}

function normalizeSharedDefinition(
  input: SharedNotationDefinitionInput,
): SharedNotationDefinitionInput {
  return {
    ...input,
    aliases: [...input.aliases].sort(),
    sources: [...input.sources].sort(),
    seeAlso: [...input.seeAlso].sort(),
    references: sortedReferences(input.references),
  };
}

function normalizeLocalDefinition(
  input: LocalNotationDefinitionInput,
): LocalNotationDefinitionInput {
  return {
    ...input,
    sources: [...input.sources].sort(),
    seeAlso: [...input.seeAlso].sort(),
    references: sortedReferences(input.references),
  };
}

function validateReferenceKey(
  reference: NotationReferenceInput,
  owner: DefinitionCandidate,
  diagnostics: NotationDiagnostic[],
): boolean {
  if (isNotationKey(reference.key)) return true;
  diagnostics.push(
    diagnostic({
      code: 'invalid-key',
      message: `${owner.id} references invalid notation key ${JSON.stringify(reference.key)}`,
      key: reference.key,
      lessonId: owner.kind === 'local' ? owner.lesson.lessonId : undefined,
      definitionId: owner.id,
      source: reference.source,
    }),
  );
  return false;
}

function validatePageReferenceKey(
  reference: NotationReferenceInput,
  lesson: NotationLessonInput,
  diagnostics: NotationDiagnostic[],
): boolean {
  if (isNotationKey(reference.key)) return true;
  diagnostics.push(
    diagnostic({
      code: 'invalid-key',
      message: `${lesson.lessonId} references invalid notation key ${JSON.stringify(reference.key)}`,
      key: reference.key,
      lessonId: lesson.lessonId,
      source: reference.source,
    }),
  );
  return false;
}

function validateSeeAlsoReferences(
  candidate: DefinitionCandidate,
  availableDefinitionIds: ReadonlySet<string>,
  declaredUses: ReadonlyMap<string, ReadonlySet<string>>,
  usedDeclarations: ReadonlyMap<string, Set<string>>,
  diagnostics: NotationDiagnostic[],
): void {
  for (const key of uniqueSorted(candidate.input.seeAlso)) {
    const reference: NotationReferenceInput = {
      key,
      kind: 'definition',
      source: candidate.input.source,
    };
    if (!validateReferenceKey(reference, candidate, diagnostics)) continue;

    const definitionId = resolveReferenceId(
      key,
      candidate.scope,
      availableDefinitionIds,
    );
    if (definitionId === undefined) {
      diagnostics.push(
        diagnostic({
          code: 'undefined-reference',
          message: `${candidate.id} has unknown seeAlso target ${key}`,
          key,
          lessonId:
            candidate.kind === 'local' ? candidate.lesson.lessonId : undefined,
          definitionId: candidate.id,
          source: candidate.input.source,
        }),
      );
      continue;
    }

    if (candidate.kind === 'shared') continue;

    const lessonId = candidate.lesson.lessonId;
    const resolvesLocally = definitionId.startsWith(`page:${lessonId}:`);
    if (resolvesLocally) continue;

    const declared = declaredUses.get(lessonId) ?? new Set<string>();
    if (!declared.has(key)) {
      diagnostics.push(
        diagnostic({
          code: 'undeclared-reference',
          message: `${lessonId} local definition ${candidate.input.key} has undeclared seeAlso target ${key}`,
          key,
          lessonId,
          definitionId: candidate.id,
          source: candidate.input.source,
        }),
      );
      continue;
    }

    usedDeclarations.get(lessonId)?.add(key);
  }
}

function toDefinitionRecord(
  candidate: DefinitionCandidate,
): NotationDefinitionRecord {
  if (candidate.kind === 'shared') {
    const input = candidate.input;
    const record: SharedNotationDefinitionRecord = {
      kind: 'shared',
      id: candidate.id,
      key: input.key,
      scope: candidate.scope,
      notation: input.notation,
      title: input.title,
      aliases: input.aliases,
      domain: input.domain,
      sources: input.sources,
      seeAlso: input.seeAlso,
      alignment: input.alignment,
      status: input.status,
      aiAssisted: input.aiAssisted,
      body: input.body,
      source: input.source,
      resolvedReferences: candidate.resolvedReferences,
      ...(input.units === undefined ? {} : { units: input.units }),
      ...(input.perspective === undefined
        ? {}
        : { perspective: input.perspective }),
    };
    return record;
  }

  const input = candidate.input;
  const record: LocalNotationDefinitionRecord = {
    kind: 'local',
    id: candidate.id,
    key: input.key,
    scope: candidate.scope,
    lessonId: candidate.lesson.lessonId,
    notation: input.notation,
    title: input.title,
    summary: input.summary,
    sources: input.sources,
    seeAlso: input.seeAlso,
    alignment: input.alignment,
    status: candidate.lesson.status,
    source: input.source,
    resolvedReferences: candidate.resolvedReferences,
    ...(input.details === undefined ? {} : { details: input.details }),
    ...(input.formula === undefined ? {} : { formula: input.formula }),
    ...(input.units === undefined ? {} : { units: input.units }),
  };
  return record;
}

function definitionFingerprint(candidate: DefinitionCandidate): string {
  const references = sortedReferences(candidate.input.references).map(
    (reference) => ({
      key: reference.key,
      kind: reference.kind,
    }),
  );
  const inputAlignment = candidate.input.alignment;
  const alignment =
    inputAlignment.kind === 'general'
      ? {
          kind: inputAlignment.kind,
          rationale: normalizeText(inputAlignment.rationale),
        }
      : {
          kind: inputAlignment.kind,
          introducedByCompetency: inputAlignment.introducedByCompetency,
          introducedInLesson: inputAlignment.introducedInLesson,
        };

  if (candidate.kind === 'shared') {
    const input = candidate.input;
    return JSON.stringify({
      kind: candidate.kind,
      key: input.key,
      notation: input.notation,
      title: normalizeText(input.title),
      aliases: [...input.aliases].sort(),
      domain: input.domain,
      units: input.units,
      perspective: input.perspective,
      sources: [...input.sources].sort(),
      seeAlso: [...input.seeAlso].sort(),
      alignment,
      status: input.status,
      aiAssisted: input.aiAssisted,
      body: normalizeText(input.body),
      references,
    });
  }

  const input = candidate.input;
  return JSON.stringify({
    kind: candidate.kind,
    key: input.key,
    notation: input.notation,
    title: normalizeText(input.title),
    summary: normalizeText(input.summary),
    details:
      input.details === undefined ? undefined : normalizeText(input.details),
    formula: input.formula,
    units: input.units,
    sources: [...input.sources].sort(),
    seeAlso: [...input.seeAlso].sort(),
    alignment,
    references,
  });
}

function normalizeText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

function detectCycles(
  definitions: ReadonlyMap<string, DefinitionCandidate>,
  edgeIndex: ReadonlyMap<string, readonly string[]>,
  diagnostics: NotationDiagnostic[],
): void {
  const states = new Map<string, 'visiting' | 'visited'>();
  const stack: string[] = [];
  const reported = new Set<string>();

  const visit = (definitionId: string): void => {
    states.set(definitionId, 'visiting');
    stack.push(definitionId);

    for (const dependencyId of edgeIndex.get(definitionId) ?? []) {
      const state = states.get(dependencyId);
      if (state === undefined) {
        visit(dependencyId);
      } else if (state === 'visiting') {
        const start = stack.lastIndexOf(dependencyId);
        const path = canonicalCycle([...stack.slice(start), dependencyId]);
        const key = path.join('>');
        if (!reported.has(key)) {
          reported.add(key);
          const first = definitions.get(path[0] ?? '');
          diagnostics.push({
            code: 'reference-cycle',
            severity: 'error',
            message: `notation reference cycle: ${path.join(' -> ')}`,
            key: first?.input.key,
            lessonId:
              first?.kind === 'local' ? first.lesson.lessonId : undefined,
            definitionId: path[0],
            source: first?.input.source,
            path,
          });
        }
      }
    }

    stack.pop();
    states.set(definitionId, 'visited');
  };

  for (const id of [...definitions.keys()].sort()) {
    if (states.get(id) === undefined) visit(id);
  }
}

function canonicalCycle(path: readonly string[]): readonly string[] {
  const nodes = path.slice(0, -1);
  if (nodes.length === 0) return path;

  let best = [...nodes];
  let bestKey = best.join('\u0000');
  for (let index = 1; index < nodes.length; index += 1) {
    const rotation = [...nodes.slice(index), ...nodes.slice(0, index)];
    const key = rotation.join('\u0000');
    if (key < bestKey) {
      best = rotation;
      bestKey = key;
    }
  }
  return [...best, best[0] as string];
}

function transitiveClosure(
  roots: ReadonlySet<string>,
  edgeIndex: ReadonlyMap<string, readonly string[]>,
): readonly string[] {
  const reached = new Set<string>();
  const pending = [...roots].sort().reverse();
  while (pending.length > 0) {
    const id = pending.pop();
    if (id === undefined || reached.has(id)) continue;
    reached.add(id);
    const dependencies = edgeIndex.get(id) ?? [];
    for (let index = dependencies.length - 1; index >= 0; index -= 1) {
      const dependency = dependencies[index];
      if (dependency !== undefined && !reached.has(dependency)) {
        pending.push(dependency);
      }
    }
  }
  return [...reached].sort();
}

function sortedReferences(
  references: readonly NotationReferenceInput[],
): NotationReferenceInput[] {
  return [...references].sort(
    (left, right) =>
      compareSourceSpans(left.source, right.source) ||
      left.key.localeCompare(right.key) ||
      left.kind.localeCompare(right.kind),
  );
}

function sortResolvedReferences(
  references: readonly ResolvedNotationReference[],
): ResolvedNotationReference[] {
  return [...references].sort(
    (left, right) =>
      compareSourceSpans(left.source, right.source) ||
      left.key.localeCompare(right.key) ||
      left.kind.localeCompare(right.kind) ||
      left.definitionId.localeCompare(right.definitionId),
  );
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function sortedSources(values: readonly SourceSpan[]): SourceSpan[] {
  return [...values].sort(compareSourceSpans);
}

function diagnostic(
  input: Omit<NotationDiagnostic, 'severity'>,
): NotationDiagnostic {
  return { ...input, severity: 'error' };
}
