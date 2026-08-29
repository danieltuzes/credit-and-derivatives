import { assertValidCurriculum } from '../src/curriculum/validation';
import { assertValidNotationAlignment } from '../src/notation/curriculum-alignment';
import {
  assertValidNotation,
  buildNotationRegistry,
} from '../src/notation/registry';
import { loadCurriculumCatalog } from './curriculum-files';
import { loadNotationRegistryInput } from './notation-files';

const [catalog, notationInput] = await Promise.all([
  loadCurriculumCatalog(),
  loadNotationRegistryInput(),
]);
assertValidCurriculum(catalog);
const notationRegistry = buildNotationRegistry(notationInput);
assertValidNotation(notationRegistry);
assertValidNotationAlignment(notationRegistry, catalog);
for (const warning of notationRegistry.diagnostics.filter(
  (diagnostic) => diagnostic.severity === 'warning',
)) {
  console.warn(`[${warning.code}] ${warning.message}`);
}

const itemCount = catalog.assessments.reduce(
  (count, assessment) => count + assessment.items.length,
  0,
);

console.log(
  `Content valid: ${catalog.competencies.length} competencies, ${catalog.lessons.length} lessons, ${itemCount} assessment items, ${notationRegistry.definitions.length} notation definitions, ${catalog.sources.length} sources, ${catalog.tracks.length} track.`,
);
