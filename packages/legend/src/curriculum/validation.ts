export interface CompetencyDefinition {
  readonly id: string;
  readonly title: string;
  readonly prerequisites: readonly string[];
  readonly evidence: {
    readonly minimumIndependentItems: number;
    readonly requiresTransfer: boolean;
    readonly requiresUnassistedPass: boolean;
  };
}

export interface LessonDefinition {
  readonly id: string;
  readonly status: 'draft' | 'in-review' | 'reviewed';
  readonly requires: readonly string[];
  readonly teaches: readonly string[];
  readonly assessments: readonly string[];
  readonly sources: readonly string[];
  readonly assumptions: readonly string[];
  /** Raw Markdown body, used to keep inline `[@…]` citations in sync with `sources`. */
  readonly body?: string;
}

interface AssessmentItemBase {
  readonly id: string;
  readonly competencyId: string;
  readonly evidenceKind: 'direct' | 'transfer';
}

export interface NumericAssessmentItem extends AssessmentItemBase {
  readonly type: 'numeric';
  readonly answer: { readonly value: number; readonly tolerance: number };
}

export interface ChoiceAssessmentItem extends AssessmentItemBase {
  readonly type: 'single-choice';
  readonly options: readonly { readonly id: string; readonly label: string }[];
  readonly correctOptionId: string;
}

export interface AssessmentDefinition {
  readonly id: string;
  readonly items: readonly (NumericAssessmentItem | ChoiceAssessmentItem)[];
}

export interface SourceDefinition {
  readonly id: string;
  readonly editorialStatus: 'draft' | 'in-review' | 'reviewed';
}

export interface TrackDefinition {
  readonly id: string;
  readonly lessons: readonly string[];
}

export interface CurriculumCatalog {
  readonly competencies: readonly CompetencyDefinition[];
  readonly lessons: readonly LessonDefinition[];
  readonly assessments: readonly AssessmentDefinition[];
  readonly sources: readonly SourceDefinition[];
  readonly tracks: readonly TrackDefinition[];
}

export interface CurriculumIssue {
  readonly kind:
    | 'invalid-id'
    | 'duplicate-id'
    | 'unknown-reference'
    | 'duplicate-reference'
    | 'self-prerequisite'
    | 'cycle'
    | 'lesson-order'
    | 'track-order'
    | 'assessment-coverage'
    | 'invalid-assessment'
    | 'review-state'
    | 'teaches-support';
  readonly message: string;
  /**
   * `error` (default) blocks the build; `warning` is reported but non-blocking.
   * New checks enter as warnings and are promoted once they run clean on real
   * content.
   */
  readonly severity?: 'error' | 'warning';
}

const VALID_ID = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

function buildIndex<T extends { readonly id: string }>(
  kind: string,
  entries: readonly T[],
  issues: CurriculumIssue[],
): Map<string, T> {
  const index = new Map<string, T>();
  for (const entry of entries) {
    if (!VALID_ID.test(entry.id)) {
      issues.push({
        kind: 'invalid-id',
        message: `${kind} has invalid id ${JSON.stringify(entry.id)}`,
      });
      continue;
    }
    if (index.has(entry.id)) {
      issues.push({
        kind: 'duplicate-id',
        message: `duplicate ${kind} id ${entry.id}`,
      });
      continue;
    }
    index.set(entry.id, entry);
  }
  return index;
}

/**
 * Source ids referenced by `[@id]` (optionally `[@id; locator]`) in a lesson
 * body, with fenced and inline code removed first so an example of the syntax
 * does not count as a real citation.
 */
function citedSourceIds(body: string | undefined): Set<string> {
  if (!body) return new Set();
  const withoutCode = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '');
  const ids = new Set<string>();
  for (const match of withoutCode.matchAll(
    /\[@([a-z0-9][a-z0-9.-]*)(?:;[^\]]*)?\]/g,
  )) {
    ids.add((match[1] ?? '').trim());
  }
  return ids;
}

function findDuplicates(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function validateCompetencyGraph(
  competencies: ReadonlyMap<string, CompetencyDefinition>,
  issues: CurriculumIssue[],
): void {
  for (const competency of competencies.values()) {
    for (const prerequisiteId of findDuplicates(competency.prerequisites)) {
      issues.push({
        kind: 'duplicate-reference',
        message: `${competency.id} repeats prerequisite ${prerequisiteId}`,
      });
    }
    for (const prerequisiteId of competency.prerequisites) {
      if (prerequisiteId === competency.id) {
        issues.push({
          kind: 'self-prerequisite',
          message: `${competency.id} requires itself`,
        });
      } else if (!competencies.has(prerequisiteId)) {
        issues.push({
          kind: 'unknown-reference',
          message: `${competency.id} requires unknown competency ${prerequisiteId}`,
        });
      }
    }
  }

  const state = new Map<string, 'visiting' | 'visited'>();
  const stack: string[] = [];
  const reportedCycles = new Set<string>();

  const visit = (id: string): void => {
    state.set(id, 'visiting');
    stack.push(id);

    for (const prerequisiteId of competencies.get(id)?.prerequisites ?? []) {
      if (prerequisiteId === id || !competencies.has(prerequisiteId)) continue;
      const prerequisiteState = state.get(prerequisiteId);
      if (prerequisiteState === undefined) {
        visit(prerequisiteId);
      } else if (prerequisiteState === 'visiting') {
        const start = stack.lastIndexOf(prerequisiteId);
        const path = [...stack.slice(start), prerequisiteId];
        const key = [...new Set(path)].sort().join('|');
        if (!reportedCycles.has(key)) {
          reportedCycles.add(key);
          issues.push({
            kind: 'cycle',
            message: `prerequisite cycle: ${path.join(' -> ')}`,
          });
        }
      }
    }

    stack.pop();
    state.set(id, 'visited');
  };

  for (const id of competencies.keys()) {
    if (state.get(id) === undefined) visit(id);
  }
}

/**
 * Provisional signal that a lesson body instantiates its content with numbers:
 * a worked-example component or section, or an equation that evaluates to a
 * numeral (`… = 6.`). Deliberately broad — this gates a warning, and the
 * heuristic is expected to tighten (or be replaced by `equation-instantiated`)
 * as content is reviewed.
 */
const WORKED_INSTANCE =
  /<CompactExample\b|^#{1,6}\s+.*\b(?:worked|example)\b|=\s*-?\d|\d\.\d{3,}/im;

/**
 * `teaches`-support lint (Phase C1, warning tier): every competency a lesson
 * `teaches` needs both a worked instance in the body and at least one
 * assessment item measuring it. Enters as a warning; promoted once real
 * content runs clean. Owns nothing the stricter Tier-1 checks
 * (`assessment-measures-taught`, `equation-instantiated`) will later cover.
 */
function validateTeachesSupport(
  lessons: ReadonlyMap<string, LessonDefinition>,
  evidenceByCompetency: ReadonlyMap<string, { count: number }>,
  issues: CurriculumIssue[],
): void {
  for (const lesson of lessons.values()) {
    if (lesson.teaches.length === 0) continue;

    if (!WORKED_INSTANCE.test(lesson.body ?? '')) {
      issues.push({
        kind: 'teaches-support',
        severity: 'warning',
        message: `${lesson.id} teaches ${lesson.teaches.join(', ')} but the body has no worked instance (CompactExample or a worked-example section)`,
      });
    }

    const unmeasured = lesson.teaches.filter(
      (competencyId) =>
        (evidenceByCompetency.get(competencyId)?.count ?? 0) === 0,
    );
    if (unmeasured.length > 0) {
      issues.push({
        kind: 'teaches-support',
        severity: 'warning',
        message: `${lesson.id} teaches ${unmeasured.join(', ')} with no assessment item measuring it`,
      });
    }
  }
}

export function validateCurriculum(
  catalog: CurriculumCatalog,
): readonly CurriculumIssue[] {
  const issues: CurriculumIssue[] = [];
  const competencies = buildIndex('competency', catalog.competencies, issues);
  const lessons = buildIndex('lesson', catalog.lessons, issues);
  const assessments = buildIndex('assessment', catalog.assessments, issues);
  const sources = buildIndex('source', catalog.sources, issues);
  const tracks = buildIndex('track', catalog.tracks, issues);

  validateCompetencyGraph(competencies, issues);

  for (const lesson of lessons.values()) {
    for (const field of ['requires', 'teaches'] as const) {
      for (const duplicate of findDuplicates(lesson[field])) {
        issues.push({
          kind: 'duplicate-reference',
          message: `${lesson.id} repeats ${field} competency ${duplicate}`,
        });
      }
      for (const competencyId of lesson[field]) {
        if (!competencies.has(competencyId)) {
          issues.push({
            kind: 'unknown-reference',
            message: `${lesson.id} ${field} unknown competency ${competencyId}`,
          });
        }
      }
    }

    for (const competencyId of lesson.requires) {
      if (lesson.teaches.includes(competencyId)) {
        issues.push({
          kind: 'lesson-order',
          message: `${lesson.id} both requires and teaches ${competencyId}`,
        });
      }
    }

    const available = new Set(lesson.requires);
    for (const competencyId of lesson.teaches) {
      const competency = competencies.get(competencyId);
      if (competency) {
        for (const prerequisiteId of competency.prerequisites) {
          if (!available.has(prerequisiteId)) {
            issues.push({
              kind: 'lesson-order',
              message: `${lesson.id} teaches ${competencyId} before prerequisite ${prerequisiteId} is available`,
            });
          }
        }
      }
      available.add(competencyId);
    }

    for (const assessmentId of lesson.assessments) {
      if (!assessments.has(assessmentId)) {
        issues.push({
          kind: 'unknown-reference',
          message: `${lesson.id} references unknown assessment ${assessmentId}`,
        });
      }
    }
    const cited = citedSourceIds(lesson.body);
    for (const sourceId of lesson.sources) {
      const source = sources.get(sourceId);
      if (!source) {
        issues.push({
          kind: 'unknown-reference',
          message: `${lesson.id} references unknown source ${sourceId}`,
        });
      } else if (
        lesson.status === 'reviewed' &&
        source.editorialStatus !== 'reviewed'
      ) {
        issues.push({
          kind: 'review-state',
          message: `${lesson.id} is reviewed but source ${sourceId} is ${source.editorialStatus}`,
        });
      }
      if (lesson.body !== undefined && !cited.has(sourceId)) {
        issues.push({
          kind: 'unknown-reference',
          message: `${lesson.id} declares source ${sourceId} but never cites it with [@${sourceId}]`,
        });
      }
    }
    for (const sourceId of cited) {
      if (!lesson.sources.includes(sourceId)) {
        issues.push({
          kind: 'unknown-reference',
          message: `${lesson.id} cites ${sourceId} in prose but does not list it in frontmatter sources`,
        });
      }
    }
    if (lesson.teaches.length > 0 && lesson.assumptions.length === 0) {
      issues.push({
        kind: 'review-state',
        message: `${lesson.id} teaches quantitative content but declares no assumptions`,
      });
    }
  }

  const itemIds = new Set<string>();
  const evidenceByCompetency = new Map<
    string,
    { count: number; hasTransfer: boolean }
  >();

  for (const assessment of assessments.values()) {
    for (const item of assessment.items) {
      if (itemIds.has(item.id)) {
        issues.push({
          kind: 'duplicate-id',
          message: `duplicate assessment item id ${item.id}`,
        });
      }
      itemIds.add(item.id);

      if (!competencies.has(item.competencyId)) {
        issues.push({
          kind: 'unknown-reference',
          message: `${assessment.id}/${item.id} measures unknown competency ${item.competencyId}`,
        });
      }

      if (item.type === 'single-choice') {
        if (
          !item.options.some((option) => option.id === item.correctOptionId)
        ) {
          issues.push({
            kind: 'invalid-assessment',
            message: `${assessment.id}/${item.id} has unknown correct option ${item.correctOptionId}`,
          });
        }
      } else if (
        !Number.isFinite(item.answer.value) ||
        !Number.isFinite(item.answer.tolerance) ||
        item.answer.tolerance <= 0
      ) {
        issues.push({
          kind: 'invalid-assessment',
          message: `${assessment.id}/${item.id} has an invalid numeric answer or tolerance`,
        });
      }

      const evidence = evidenceByCompetency.get(item.competencyId) ?? {
        count: 0,
        hasTransfer: false,
      };
      evidence.count += 1;
      evidence.hasTransfer ||= item.evidenceKind === 'transfer';
      evidenceByCompetency.set(item.competencyId, evidence);
    }
  }

  const taughtCompetencies = new Set(
    [...lessons.values()].flatMap((lesson) => [...lesson.teaches]),
  );
  for (const competencyId of taughtCompetencies) {
    const competency = competencies.get(competencyId);
    if (!competency) continue;
    const evidence = evidenceByCompetency.get(competencyId) ?? {
      count: 0,
      hasTransfer: false,
    };
    if (evidence.count < competency.evidence.minimumIndependentItems) {
      issues.push({
        kind: 'assessment-coverage',
        message: `${competencyId} has ${evidence.count} assessment item(s), fewer than required ${competency.evidence.minimumIndependentItems}`,
      });
    }
    if (competency.evidence.requiresTransfer && !evidence.hasTransfer) {
      issues.push({
        kind: 'assessment-coverage',
        message: `${competencyId} requires a transfer assessment item`,
      });
    }
  }

  validateTeachesSupport(lessons, evidenceByCompetency, issues);

  for (const track of tracks.values()) {
    const available = new Set<string>();
    for (const duplicate of findDuplicates(track.lessons)) {
      issues.push({
        kind: 'duplicate-reference',
        message: `${track.id} repeats lesson ${duplicate}`,
      });
    }
    for (const lessonId of track.lessons) {
      const lesson = lessons.get(lessonId);
      if (!lesson) {
        issues.push({
          kind: 'unknown-reference',
          message: `${track.id} references unknown lesson ${lessonId}`,
        });
        continue;
      }
      for (const competencyId of lesson.requires) {
        if (!available.has(competencyId)) {
          issues.push({
            kind: 'track-order',
            message: `${track.id} reaches ${lessonId} before required competency ${competencyId} is taught`,
          });
        }
      }
      for (const competencyId of lesson.teaches) available.add(competencyId);
    }
  }

  return issues;
}

/** Issues that block the build (everything except `severity: 'warning'`). */
export function curriculumErrors(
  issues: readonly CurriculumIssue[],
): readonly CurriculumIssue[] {
  return issues.filter((issue) => issue.severity !== 'warning');
}

export function assertValidCurriculum(catalog: CurriculumCatalog): void {
  const errors = curriculumErrors(validateCurriculum(catalog));
  if (errors.length > 0) {
    throw new Error(
      `Invalid curriculum:\n${errors.map(({ message }) => `- ${message}`).join('\n')}`,
    );
  }
}
