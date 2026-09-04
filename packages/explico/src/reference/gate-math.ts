/**
 * The completeness gate, run from the CLI (`pnpm validate:content`) over every
 * rendered-math context — lesson body `$…$` / `$$…$$` (including math inside
 * component slots), each `notation.local` `formula`, and any `$…$` in an
 * assessment `prompt` / `explanation`. It reuses the one resolver the Astro
 * remark pass uses (`resolveMathGlyphs`), so there is a single glyph table and
 * a single diagnostic shape; `astro build` re-runs the same resolver on the
 * render path as a backstop.
 *
 * Every failure names `file:line: "token"` and the fix.
 */
import { resolveMathGlyphs, GlyphResolutionError } from './math-glyphs.mjs';
import { stripEquationLabels } from './equations.mjs';
import { formulaGlyphScope, unknownFormulaScopeKeys } from './gloss';
import type { GlyphScopeEntry } from './gloss';
import type {
  NotationLessonInput,
  NotationRegistryInput,
  SharedNotationDefinitionInput,
} from './types';

export interface MathGateDiagnostic {
  readonly context: 'body' | 'formula' | 'assessment';
  /**
   * Body / component-slot math blocks the build (the render path needs every
   * glyph resolved for the KaTeX trust callback). `formula` joined it at D15:
   * a formula's glyphs are now rendered live and explorable, so an unresolved
   * one is a hole the reader can see, and the corpus was brought to zero when
   * the tier was promoted. `assessment` math stays a Tier-3 warning until its
   * own reviewed content pass (D6/D13/D14).
   */
  readonly severity: 'error' | 'warning';
  readonly file: string;
  readonly line?: number;
  readonly token?: string;
  readonly message: string;
}

const SEVERITY: Record<MathGateDiagnostic['context'], 'error' | 'warning'> = {
  body: 'error',
  formula: 'error',
  assessment: 'warning',
};

interface AssessmentItemLike {
  readonly id?: string;
  readonly prompt?: string;
  readonly explanation?: string;
}
interface AssessmentLike {
  readonly id: string;
  readonly items?: readonly AssessmentItemLike[];
}
interface LessonAssessmentLink {
  readonly lessonId: string;
  readonly assessmentIds: readonly string[];
}

const TERM_KEY = /\[\[\s*([a-z0-9]+(?:[.-][a-z0-9]+)*)\s*\]\]/g;
const EXPLAIN_KEY = /\\explain\s*\{([a-z0-9]+(?:[.-][a-z0-9]+)*)\}/g;
const DISPLAY_MATH = /\$\$([\s\S]+?)\$\$/g;
const INLINE_MATH = /(?<![\\$])\$(?!\s)([^$\n]+?)(?<![\\\s])\$(?!\d)/g;

function stripCode(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^`])`[^`\n]*`/g, (match) => match.replace(/[^\n]/g, ' '));
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
}

interface MathSpan {
  readonly latex: string;
  readonly line: number;
}

function mathSpans(body: string): MathSpan[] {
  const searchable = stripCode(body);
  const spans: MathSpan[] = [];
  for (const pattern of [DISPLAY_MATH, INLINE_MATH]) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(searchable))) {
      spans.push({
        // D7: `\label{eq:…}` is an identity marker, not math KaTeX parses.
        latex: stripEquationLabels(match[1] ?? ''),
        line: lineOf(body, match.index),
      });
    }
  }
  return spans;
}

type ScopeEntry = { key: string; notation: string };

function pageScope(
  lesson: NotationLessonInput,
  sharedByKey: ReadonlyMap<string, SharedNotationDefinitionInput>,
): ScopeEntry[] {
  const local = lesson.localDefinitions.map((definition) => ({
    key: definition.key,
    notation: definition.notation,
  }));
  const localKeys = new Set(local.map((entry) => entry.key));

  const referenced = new Set<string>();
  for (const pattern of [TERM_KEY, EXPLAIN_KEY]) {
    for (const match of lesson.body.matchAll(pattern)) referenced.add(match[1]);
  }

  const scope = [...local];
  for (const key of referenced) {
    if (localKeys.has(key)) continue;
    const shared = sharedByKey.get(key);
    if (shared) scope.push({ key: shared.key, notation: shared.notation });
  }
  return scope;
}

function resolveInto(
  latex: string,
  scope: readonly ScopeEntry[],
  context: MathGateDiagnostic['context'],
  file: string,
  line: number | undefined,
  fix: string,
  out: MathGateDiagnostic[],
): void {
  let result;
  try {
    result = resolveMathGlyphs(latex, [...scope]);
  } catch (error) {
    out.push({
      context,
      severity: SEVERITY[context],
      file,
      line,
      message:
        error instanceof GlyphResolutionError
          ? error.message
          : `Could not compile math ${JSON.stringify(latex)}: ${
              error instanceof Error ? error.message : String(error)
            }`,
    });
    return;
  }
  for (const { token } of result.unresolved) {
    out.push({
      context,
      severity: SEVERITY[context],
      file,
      line,
      token,
      message: `Unresolved notation ${JSON.stringify(token)} in ${context} math. ${fix}`,
    });
  }
}

const BODY_FIX =
  'Introduce the symbol with [[key]], define it in notation.local, or wrap it in \\explain{key}{latex}.';
function dedupeScope(scope: readonly GlyphScopeEntry[]): GlyphScopeEntry[] {
  const seen = new Set<string>();
  const out: GlyphScopeEntry[] = [];
  for (const entry of scope) {
    if (seen.has(entry.key)) continue;
    seen.add(entry.key);
    out.push(entry);
  }
  return out;
}

/**
 * `\explain{key}` in a formula widens the glyph scope without becoming a
 * reference edge (D15), so nothing else checks that the key exists. Report it
 * here: a marker pointing at no card is an authoring mistake, not a silent
 * fall-through to an unresolved glyph.
 */
function reportUnknownScopeKeys(
  definition: {
    readonly key: string;
    readonly formula?: string;
    readonly glosses: readonly { readonly key: string }[];
  },
  cardKeys: ReadonlySet<string>,
  file: string,
  out: MathGateDiagnostic[],
): void {
  const glossKeys = new Set(definition.glosses.map((gloss) => gloss.key));
  for (const key of unknownFormulaScopeKeys(
    definition.formula,
    glossKeys,
    cardKeys,
  )) {
    out.push({
      context: 'formula',
      severity: SEVERITY.formula,
      file,
      token: key,
      message: `${definition.key} formula names unknown notation key ${JSON.stringify(key)}. Name an existing card, or declare the symbol under glosses: on this entry.`,
    });
  }
}

const SHARED_FORMULA_FIX =
  'Every symbol in a notation entry formula must resolve to the entry itself, one of its glosses:, a card the formula names with \\explain{key}{latex}, or the base library.';
const FORMULA_FIX =
  'Every right-hand-side variable of a notation.local formula must resolve to the entry key, another page symbol, or the base library.';
const ASSESSMENT_FIX =
  "Introduce the symbol in the owning lesson's prose with [[key]], or wrap it in \\explain{key}{latex}.";

/**
 * Resolve every rendered-math context against the page glyph table. Returns one
 * diagnostic per unresolved token; an empty array means the gate passed.
 */
export function gateContentMath(input: {
  readonly notationInput: NotationRegistryInput;
  readonly assessments: readonly AssessmentLike[];
  readonly lessonAssessments: readonly LessonAssessmentLink[];
}): MathGateDiagnostic[] {
  const { notationInput, assessments, lessonAssessments } = input;
  const sharedByKey = new Map(
    notationInput.sharedDefinitions.map((definition) => [
      definition.key,
      definition,
    ]),
  );
  const sharedCards = new Map<string, GlyphScopeEntry>(
    notationInput.sharedDefinitions.map((definition) => [
      definition.key,
      { key: definition.key, notation: definition.notation },
    ]),
  );
  const cardKeys = new Set<string>([
    ...sharedCards.keys(),
    ...notationInput.lessons.flatMap((lesson) =>
      lesson.localDefinitions.map((definition) => definition.key),
    ),
  ]);
  const lessonById = new Map(
    notationInput.lessons.map((lesson) => [lesson.lessonId, lesson]),
  );
  const assessmentById = new Map(
    assessments.map((assessment) => [assessment.id, assessment]),
  );

  const diagnostics: MathGateDiagnostic[] = [];

  for (const lesson of notationInput.lessons) {
    const scope = pageScope(lesson, sharedByKey);
    const file = lesson.source.file;

    for (const span of mathSpans(lesson.body)) {
      resolveInto(
        span.latex,
        scope,
        'body',
        file,
        span.line,
        BODY_FIX,
        diagnostics,
      );
    }

    for (const definition of lesson.localDefinitions) {
      if (!definition.formula) continue;
      // `scope` already carries every page-local entry, including this one, so
      // the formula's LHS key resolves against itself; its glosses (D15) name
      // the letters the formula introduces and nothing else on the page.
      resolveInto(
        definition.formula,
        dedupeScope([
          ...scope,
          ...definition.glosses.map((gloss) => ({
            key: gloss.key,
            notation: gloss.notation,
          })),
        ]),
        'formula',
        file,
        undefined,
        FORMULA_FIX,
        diagnostics,
      );
      reportUnknownScopeKeys(definition, cardKeys, file, diagnostics);
    }
  }

  // Shared cards carry their own rigorous `formula`. It resolves against the
  // entry-scoped table (D15) — the card, its glosses, and the cards the
  // formula names with `\explain` — not the registry-wide table the card's
  // body math uses.
  for (const definition of notationInput.sharedDefinitions) {
    if (!definition.formula) continue;
    resolveInto(
      definition.formula,
      formulaGlyphScope({
        key: definition.key,
        notation: definition.notation,
        formula: definition.formula,
        glosses: definition.glosses,
        cardsByKey: sharedCards,
      }),
      'formula',
      definition.source.file,
      undefined,
      SHARED_FORMULA_FIX,
      diagnostics,
    );
    reportUnknownScopeKeys(
      definition,
      cardKeys,
      definition.source.file,
      diagnostics,
    );
  }

  for (const link of lessonAssessments) {
    const lesson = lessonById.get(link.lessonId);
    if (!lesson) continue;
    const scope = pageScope(lesson, sharedByKey);

    for (const assessmentId of link.assessmentIds) {
      const assessment = assessmentById.get(assessmentId);
      if (!assessment?.items) continue;
      for (const item of assessment.items) {
        for (const field of [item.prompt, item.explanation]) {
          if (typeof field !== 'string') continue;
          for (const span of mathSpans(field)) {
            resolveInto(
              span.latex,
              scope,
              'assessment',
              `${assessmentId} (${item.id ?? '?'})`,
              undefined,
              ASSESSMENT_FIX,
              diagnostics,
            );
          }
        }
      }
    }
  }

  return diagnostics;
}
