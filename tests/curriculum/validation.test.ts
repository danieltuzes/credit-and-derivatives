import { describe, expect, it } from 'vitest';
import { loadCurriculumCatalog } from '../../scripts/curriculum-files';
import {
  validateCurriculum,
  type CompetencyDefinition,
  type CurriculumCatalog,
} from '../../src/curriculum/validation';

const competency = (
  id: string,
  prerequisites: readonly string[] = [],
): CompetencyDefinition => ({
  id,
  title: id,
  prerequisites,
  evidence: {
    minimumIndependentItems: 1,
    requiresTransfer: false,
    requiresUnassistedPass: false,
  },
});

const catalogWith = (
  competencies: readonly CompetencyDefinition[],
): CurriculumCatalog => ({
  competencies,
  lessons: [],
  assessments: [],
  sources: [],
  tracks: [],
});

describe('curriculum validation', () => {
  it('accepts the repository curriculum', async () => {
    expect(validateCurriculum(await loadCurriculumCatalog())).toEqual([]);
  });

  it('accepts a valid competency DAG with multiple roots', () => {
    expect(
      validateCurriculum(
        catalogWith([
          competency('math.percentages'),
          competency('math.exponents'),
          competency('rates.discounting', [
            'math.percentages',
            'math.exponents',
          ]),
          competency('bonds.present-value', ['rates.discounting']),
        ]),
      ),
    ).toEqual([]);
  });

  it('reports duplicate IDs and unknown prerequisites', () => {
    const issues = validateCurriculum(
      catalogWith([
        competency('credit.hazard', ['math.conditional-probability']),
        competency('credit.hazard'),
      ]),
    );
    expect(issues.map(({ message }) => message)).toEqual(
      expect.arrayContaining([
        'duplicate competency id credit.hazard',
        'credit.hazard requires unknown competency math.conditional-probability',
      ]),
    );
  });

  it('reports a multi-node cycle with its path', () => {
    const issues = validateCurriculum(
      catalogWith([
        competency('node-a', ['node-b']),
        competency('node-b', ['node-c']),
        competency('node-c', ['node-a']),
      ]),
    );
    expect(issues.map(({ message }) => message)).toContain(
      'prerequisite cycle: node-a -> node-b -> node-c -> node-a',
    );
  });
});
