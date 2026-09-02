import {
  assertValidCurriculum,
  validateCurriculum,
} from '../src/curriculum/validation';
import { assertValidNotationAlignment } from '../src/reference/curriculum-alignment';
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
