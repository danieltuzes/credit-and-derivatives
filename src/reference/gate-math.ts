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
import type {
  NotationLessonInput,
  NotationRegistryInput,
  SharedNotationDefinitionInput,
} from './types';

export interface MathGateDiagnostic {
  readonly context: 'body' | 'formula' | 'assessment';
  /**
   * Body / component-slot math blocks the build (the render path needs every
   * glyph resolved for the KaTeX trust callback). `formula` and `assessment`
   * math enter as warnings (Tier 3) and are promoted once existing content is
   * brought into line — they surface pre-existing ambiguities that are a
   * separate reviewed content pass (D6/D13/D14), not a D3 codemod.
   */
  readonly severity: 'error' | 'warning';
  readonly file: string;
  readonly line?: number;
  readonly token?: string;
  readonly message: string;
}

const SEVERITY: Record<MathGateDiagnostic['context'], 'error' | 'warning'> = {
  body: 'error',
  formula: 'warning',
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
      // the formula's LHS key resolves against itself.
      resolveInto(
        definition.formula,
        scope,
        'formula',
        file,
        undefined,
        FORMULA_FIX,
        diagnostics,
      );
    }
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
