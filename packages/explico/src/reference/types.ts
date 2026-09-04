export type EditorialStatus = 'draft' | 'in-review' | 'reviewed';

export interface SourceSpan {
  readonly file: string;
  readonly line?: number;
  readonly column?: number;
  readonly endLine?: number;
  readonly endColumn?: number;
}

export type NotationAlignment =
  | {
      readonly kind: 'competency';
      readonly introducedByCompetency: string;
      readonly introducedInLesson: string;
    }
  | {
      readonly kind: 'general';
      readonly rationale: string;
    };

export type NotationReferenceKind = 'prose' | 'math' | 'definition';

/**
 * A gloss resolved by the loader (D15). Declared on a card, keyed
 * `<card key>.<slug(name)>`, and deliberately absent from the registry: a
 * gloss is never a definition record, never a reference target, and never a
 * curriculum node. See `reference/gloss.ts`.
 */
export interface NotationGlossEntry {
  readonly key: string;
  readonly notation: string;
  readonly label: string;
  readonly units?: string;
  readonly ownerKey: string;
}

export interface NotationReferenceInput {
  readonly key: string;
  readonly kind: NotationReferenceKind;
  readonly source: SourceSpan;
}

export interface SharedNotationDefinitionInput {
  readonly key: string;
  readonly notation: string;
  readonly label: string;
  readonly summary: string;
  readonly aliases: readonly string[];
  readonly domain: string;
  readonly formula?: string;
  readonly units?: string;
  readonly sources: readonly string[];
  readonly seeAlso: readonly string[];
  readonly alignment: NotationAlignment;
  readonly status: EditorialStatus;
  readonly aiAssisted: boolean;
  readonly body: string;
  /** References harvested from the Markdown body. */
  readonly references: readonly NotationReferenceInput[];
  /** Symbols this entry's `formula` names but does not make cards of. */
  readonly glosses: readonly NotationGlossEntry[];
  readonly source: SourceSpan;
}

export interface LocalNotationDefinitionInput {
  readonly key: string;
  readonly notation: string;
  readonly label: string;
  readonly summary: string;
  readonly formula?: string;
  readonly units?: string;
  readonly sources: readonly string[];
  readonly seeAlso: readonly string[];
  readonly alignment: NotationAlignment;
  /** References harvested from summary content. */
  readonly references: readonly NotationReferenceInput[];
  /** Symbols this entry's `formula` names but does not make cards of. */
  readonly glosses: readonly NotationGlossEntry[];
  readonly source: SourceSpan;
}

export interface NotationLessonInput {
  readonly lessonId: string;
  readonly status: EditorialStatus;
  readonly localDefinitions: readonly LocalNotationDefinitionInput[];
  /** References harvested from lesson prose and equations, excluding definitions. */
  readonly references: readonly NotationReferenceInput[];
  /** Original lesson body, retained for lossless loader adapters. */
  readonly body: string;
  readonly source: SourceSpan;
}

export interface NotationRegistryInput {
  readonly sharedDefinitions: readonly SharedNotationDefinitionInput[];
  readonly lessons: readonly NotationLessonInput[];
}

export type NotationDiagnosticCode =
  | 'invalid-key'
  | 'duplicate-page'
  | 'duplicate-definition'
  | 'conflicting-definition'
  | 'undefined-reference'
  | 'reference-cycle'
  | 'unused-definition'
  | 'alignment-unknown-competency'
  | 'alignment-unknown-lesson'
  | 'alignment-introduction'
  | 'alignment-unavailable'
  | 'alignment-review-state'
  | 'gloss-collides-with-card';

export type DiagnosticSeverity = 'error' | 'warning';

export interface NotationDiagnostic {
  readonly code: NotationDiagnosticCode;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly key?: string;
  readonly lessonId?: string;
  readonly definitionId?: string;
  readonly source?: SourceSpan;
  readonly relatedSources?: readonly SourceSpan[];
  readonly path?: readonly string[];
}

export type NotationDefinitionScope =
  | { readonly kind: 'shared' }
  | { readonly kind: 'page'; readonly lessonId: string };

export interface ResolvedNotationReference {
  readonly key: string;
  readonly kind: NotationReferenceKind;
  readonly definitionId: string;
  readonly source: SourceSpan;
}

interface NotationDefinitionRecordBase {
  readonly id: string;
  readonly key: string;
  /**
   * Symbols this entry's `formula` names but does not make cards of (D15).
   * Carried on the record so the manifest can build the entry-scoped formula
   * table; deliberately **not** a definition, a reference target, or an edge.
   */
  readonly glosses: readonly NotationGlossEntry[];
  readonly scope: NotationDefinitionScope;
  readonly notation: string;
  readonly label: string;
  readonly seeAlso: readonly string[];
  readonly alignment: NotationAlignment;
  readonly status: EditorialStatus;
  readonly source: SourceSpan;
  readonly resolvedReferences: readonly ResolvedNotationReference[];
}

export interface SharedNotationDefinitionRecord extends NotationDefinitionRecordBase {
  readonly kind: 'shared';
  readonly summary: string;
  readonly aliases: readonly string[];
  readonly domain: string;
  readonly formula?: string;
  readonly units?: string;
  readonly sources: readonly string[];
  readonly aiAssisted: boolean;
  readonly body: string;
}

export interface LocalNotationDefinitionRecord extends NotationDefinitionRecordBase {
  readonly kind: 'local';
  readonly lessonId: string;
  readonly summary: string;
  readonly formula?: string;
  readonly units?: string;
  readonly sources: readonly string[];
}

export type NotationDefinitionRecord =
  SharedNotationDefinitionRecord | LocalNotationDefinitionRecord;

export interface NotationBinding {
  readonly key: string;
  readonly definitionId: string;
}

export interface NotationPageBundle {
  readonly lessonId: string;
  readonly status: EditorialStatus;
  readonly source: SourceSpan;
  readonly bindings: readonly NotationBinding[];
  readonly definitionIds: readonly string[];
}

export interface NotationBacklink {
  readonly definitionId: string;
  readonly key: string;
  readonly lessonId: string;
  readonly direct: boolean;
}

export interface NotationRegistry {
  readonly definitions: readonly NotationDefinitionRecord[];
  readonly bundles: readonly NotationPageBundle[];
  readonly backlinks: readonly NotationBacklink[];
  readonly diagnostics: readonly NotationDiagnostic[];
}
