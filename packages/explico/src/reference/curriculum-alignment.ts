import type { CurriculumCatalog } from '../curriculum/validation';
import { compareDiagnostics } from './references';
import type {
  NotationDefinitionRecord,
  NotationDiagnostic,
  NotationRegistry,
} from './types';

interface EditorialCompetency {
  readonly id: string;
  readonly editorialStatus?: 'draft' | 'in-review' | 'reviewed';
}

export function validateNotationAlignment(
  registry: NotationRegistry,
  catalog: CurriculumCatalog,
): readonly NotationDiagnostic[] {
  const diagnostics: NotationDiagnostic[] = [];
  const competencies = new Map(
    (catalog.competencies as readonly EditorialCompetency[]).map((entry) => [
      entry.id,
      entry,
    ]),
  );
  const lessons = new Map(catalog.lessons.map((entry) => [entry.id, entry]));
  const sources = new Map(catalog.sources.map((entry) => [entry.id, entry]));
  const trackPositions = buildTrackPositions(catalog, diagnostics);

  for (const definition of registry.definitions) {
    validateSources(definition, sources, diagnostics);

    const alignment = definition.alignment;
    if (alignment.kind === 'general') continue;

    const competency = competencies.get(alignment.introducedByCompetency);
    const lesson = lessons.get(alignment.introducedInLesson);
    if (!competency) {
      diagnostics.push(
        error(
          'alignment-unknown-competency',
          `${definition.id} is aligned to unknown competency ${alignment.introducedByCompetency}`,
          definition,
        ),
      );
    }
    if (!lesson) {
      diagnostics.push(
        error(
          'alignment-unknown-lesson',
          `${definition.id} is introduced in unknown lesson ${alignment.introducedInLesson}`,
          definition,
        ),
      );
      continue;
    }
    if (!lesson.teaches.includes(alignment.introducedByCompetency)) {
      diagnostics.push(
        error(
          'alignment-introduction',
          `${definition.id} names ${alignment.introducedInLesson} as its introduction, but that lesson does not teach ${alignment.introducedByCompetency}`,
          definition,
        ),
      );
    }
    if (
      definition.kind === 'local' &&
      alignment.introducedInLesson !== definition.lessonId
    ) {
      diagnostics.push(
        error(
          'alignment-introduction',
          `${definition.id} is page-local to ${definition.lessonId} but declares its introduction in ${alignment.introducedInLesson}`,
          definition,
        ),
      );
    }

    validateIntroductionOrder(
      definition,
      alignment.introducedInLesson,
      registry,
      trackPositions,
      diagnostics,
    );

    if (
      definition.status === 'reviewed' &&
      (lesson.status !== 'reviewed' ||
        competency?.editorialStatus !== 'reviewed')
    ) {
      diagnostics.push(
        error(
          'alignment-review-state',
          `${definition.id} is reviewed while its owning lesson or competency is not reviewed`,
          definition,
        ),
      );
    }
  }

  return diagnostics.sort(compareDiagnostics);
}

export function assertValidNotationAlignment(
  registry: NotationRegistry,
  catalog: CurriculumCatalog,
): void {
  const errors = validateNotationAlignment(registry, catalog).filter(
    (diagnostic) => diagnostic.severity === 'error',
  );
  if (errors.length === 0) return;
  throw new Error(
    `Invalid notation alignment:\n${errors
      .map((diagnostic) => `- [${diagnostic.code}] ${diagnostic.message}`)
      .join('\n')}`,
  );
}

function buildTrackPositions(
  catalog: CurriculumCatalog,
  diagnostics: NotationDiagnostic[],
): Map<string, Map<string, number>> {
  const positions = new Map<string, Map<string, number>>();
  for (const track of catalog.tracks) {
    const trackMap = new Map<string, number>();
    track.lessons.forEach((lessonId, index) => trackMap.set(lessonId, index));
    positions.set(track.id, trackMap);
  }
  if (positions.size === 0 && catalog.lessons.length > 0) {
    diagnostics.push({
      code: 'alignment-unavailable',
      severity: 'error',
      message: 'notation introduction order cannot be checked without a track',
    });
  }
  return positions;
}

function validateIntroductionOrder(
  definition: NotationDefinitionRecord,
  introductionLessonId: string,
  registry: NotationRegistry,
  trackPositions: ReadonlyMap<string, ReadonlyMap<string, number>>,
  diagnostics: NotationDiagnostic[],
): void {
  const usedIn = registry.backlinks
    .filter((backlink) => backlink.definitionId === definition.id)
    .map((backlink) => backlink.lessonId);

  for (const [trackId, positions] of trackPositions) {
    const introductionPosition = positions.get(introductionLessonId);
    for (const lessonId of usedIn) {
      const usePosition = positions.get(lessonId);
      if (usePosition === undefined) continue;
      if (introductionPosition === undefined) {
        diagnostics.push(
          error(
            'alignment-unavailable',
            `${definition.id} is used by ${lessonId} in track ${trackId}, but its declared introduction ${introductionLessonId} is absent from that track`,
            definition,
            lessonId,
          ),
        );
      } else if (usePosition < introductionPosition) {
        diagnostics.push(
          error(
            'alignment-introduction',
            `${definition.id} is used by ${lessonId} before its declared introduction ${introductionLessonId} in track ${trackId}`,
            definition,
            lessonId,
          ),
        );
      }
    }
  }
}

function validateSources(
  definition: NotationDefinitionRecord,
  sources: ReadonlyMap<
    string,
    { readonly editorialStatus: 'draft' | 'in-review' | 'reviewed' }
  >,
  diagnostics: NotationDiagnostic[],
): void {
  for (const sourceId of definition.sources) {
    const source = sources.get(sourceId);
    if (!source) {
      diagnostics.push(
        error(
          'alignment-unavailable',
          `${definition.id} cites unknown source ${sourceId}`,
          definition,
        ),
      );
    } else if (
      definition.status === 'reviewed' &&
      source.editorialStatus !== 'reviewed'
    ) {
      diagnostics.push(
        error(
          'alignment-review-state',
          `${definition.id} is reviewed while source ${sourceId} is ${source.editorialStatus}`,
          definition,
        ),
      );
    }
  }
}

function error(
  code: NotationDiagnostic['code'],
  message: string,
  definition: NotationDefinitionRecord,
  lessonId?: string,
): NotationDiagnostic {
  return {
    code,
    severity: 'error',
    message,
    key: definition.key,
    definitionId: definition.id,
    lessonId:
      lessonId ??
      (definition.kind === 'local' ? definition.lessonId : undefined),
    source: definition.source,
  };
}
