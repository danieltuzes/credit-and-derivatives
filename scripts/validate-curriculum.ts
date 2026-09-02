import {
  assertValidCurriculum,
  validateCurriculum,
} from '../src/curriculum/validation';
import { assertValidNotationAlignment } from '../src/reference/curriculum-alignment';
import { gateContentMath } from '../src/reference/gate-math';
import {
  assertValidNotation,
  buildNotationRegistry,
} from '../src/reference/registry';
import {
  loadCurriculumCatalog,
  loadNotationRegistryInput,
  notationSourceLocatorGaps,
} from '../src/content/collections';

const [catalog, notationInput] = await Promise.all([
  loadCurriculumCatalog(),
  loadNotationRegistryInput(),
]);
for (const warning of validateCurriculum(catalog).filter(
  (issue) => issue.severity === 'warning',
)) {
  console.warn(`[${warning.kind}] ${warning.message}`);
}
assertValidCurriculum(catalog);
const notationRegistry = buildNotationRegistry(notationInput);
assertValidNotation(notationRegistry);
assertValidNotationAlignment(notationRegistry, catalog);
for (const warning of notationRegistry.diagnostics.filter(
  (diagnostic) => diagnostic.severity === 'warning',
)) {
  console.warn(`[${warning.code}] ${warning.message}`);
}

// Completeness gate (D3): resolve every rendered-math context against the page
// glyph table — lesson body, `notation.local` formulas, and assessment
// prompt/explanation math — with the same resolver the Astro remark pass uses.
const mathGate = gateContentMath({
  notationInput,
  assessments: catalog.assessments as unknown as {
    id: string;
    items?: { id?: string; prompt?: string; explanation?: string }[];
  }[],
  lessonAssessments: catalog.lessons.map((lesson) => ({
    lessonId: lesson.id,
    assessmentIds: lesson.assessments,
  })),
});
const formatMathIssue = (issue: (typeof mathGate)[number]): string => {
  const at = issue.line ? `${issue.file}:${issue.line}` : issue.file;
  return `[math-complete] ${at}: ${issue.message}`;
};
for (const issue of mathGate.filter((item) => item.severity === 'warning')) {
  console.warn(formatMathIssue(issue));
}
const mathGateErrors = mathGate.filter((issue) => issue.severity === 'error');
if (mathGateErrors.length > 0) {
  throw new Error(
    `Completeness gate failed in ${mathGateErrors.length} rendered-math context(s):\n${mathGateErrors
      .map((issue) => `- ${formatMathIssue(issue)}`)
      .join('\n')}`,
  );
}

const locatorGaps = notationSourceLocatorGaps();
if (locatorGaps.bare > 0) {
  console.warn(
    `[notation-source-locator] ${locatorGaps.bare} of ${locatorGaps.total} notation source citations are bare ids without a { id, locator } (pending D6/g).`,
  );
}

const itemCount = catalog.assessments.reduce(
  (count, assessment) => count + assessment.items.length,
  0,
);

console.log(
  `Content valid: ${catalog.competencies.length} competencies, ${catalog.lessons.length} lessons, ${itemCount} assessment items, ${notationRegistry.definitions.length} notation definitions, ${catalog.sources.length} sources, ${catalog.tracks.length} track.`,
);
