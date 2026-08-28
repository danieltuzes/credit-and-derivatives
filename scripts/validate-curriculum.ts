import { assertValidCurriculum } from '../src/curriculum/validation';
import { loadCurriculumCatalog } from './curriculum-files';

const catalog = await loadCurriculumCatalog();
assertValidCurriculum(catalog);

const itemCount = catalog.assessments.reduce(
  (count, assessment) => count + assessment.items.length,
  0,
);

console.log(
  `Curriculum valid: ${catalog.competencies.length} competencies, ${catalog.lessons.length} lessons, ${itemCount} assessment items, ${catalog.sources.length} sources, ${catalog.tracks.length} track.`,
);
