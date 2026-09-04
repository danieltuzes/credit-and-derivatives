import { describe, expect, it } from 'vitest';

import type { CurriculumCatalog } from 'explico/curriculum/validation';
import { runConsistencyChecks } from 'explico/reference/consistency';
import { buildNotationRegistry } from 'explico/reference/registry';
import { resolveGlosses } from 'explico/reference/gloss';
import type {
  NotationGlossEntry,
  NotationRegistryInput,
  SharedNotationDefinitionInput,
} from 'explico/reference/types';
import { courseConfig } from '../../content/course.config';

const NO_IGNORE = { entries: [], matches: () => false };

const catalog: CurriculumCatalog = {
  competencies: [],
  lessons: [],
  assessments: [],
  sources: [],
  tracks: [],
};

const card = (
  key: string,
  overrides: Partial<SharedNotationDefinitionInput> = {},
): SharedNotationDefinitionInput => ({
  key,
  notation: key.slice(0, 1).toUpperCase(),
  label: key,
  summary: `${key} is a test meaning for the two-tier vocabulary checks`,
  aliases: [],
  domain: 'test',
  sources: [],
  seeAlso: [],
  alignment: { kind: 'general', rationale: 'Test fixture.' },
  status: 'draft',
  aiAssisted: false,
  body: '',
  references: [],
  glosses: [],
  source: { file: `content/notation/${key}.md` },
  ...overrides,
});

const glossesOn = (ownerKey: string): NotationGlossEntry[] =>
  resolveGlosses(ownerKey, [{ latex: '\\Omega', name: 'sample space' }]);

const run = (sharedDefinitions: SharedNotationDefinitionInput[]) => {
  const notationInput: NotationRegistryInput = {
    sharedDefinitions,
    lessons: [],
  };
  return runConsistencyChecks({
    registry: buildNotationRegistry(notationInput),
    notationInput,
    specs: [],
    catalog,
    lintIgnore: NO_IGNORE,
    conventions: courseConfig.conventions,
  });
};

describe('gloss-wants-promoting', () => {
  it('flags one gloss repeated across enough entries to be a shared meaning', () => {
    const findings = run([
      card('alpha', { glosses: glossesOn('alpha') }),
      card('beta', { glosses: glossesOn('beta') }),
      card('gamma', { glosses: glossesOn('gamma') }),
    ]).filter((finding) => finding.code === 'gloss-wants-promoting');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: 'warning',
      glyph: '\\Omega',
    });
    expect(findings[0]?.message).toContain('alpha, beta, gamma');
  });

  it('stays quiet while the same letter is glossed on only two entries', () => {
    const findings = run([
      card('alpha', { glosses: glossesOn('alpha') }),
      card('beta', { glosses: glossesOn('beta') }),
    ]).filter((finding) => finding.code === 'gloss-wants-promoting');

    expect(findings).toEqual([]);
  });

  it('is silenced by a reviewed lint-ignore line', () => {
    const notationInput: NotationRegistryInput = {
      sharedDefinitions: [
        card('alpha', { glosses: glossesOn('alpha') }),
        card('beta', { glosses: glossesOn('beta') }),
        card('gamma', { glosses: glossesOn('gamma') }),
      ],
      lessons: [],
    };
    const findings = runConsistencyChecks({
      registry: buildNotationRegistry(notationInput),
      notationInput,
      specs: [],
      catalog,
      lintIgnore: {
        entries: [],
        matches: (code, detail) =>
          code === 'gloss-wants-promoting' && detail === '\\Omega',
      },
      conventions: courseConfig.conventions,
    });

    expect(
      findings.filter((finding) => finding.code === 'gloss-wants-promoting'),
    ).toEqual([]);
  });
});

describe('card-wants-demoting', () => {
  it('flags a card that carries no more than a name', () => {
    const findings = run([card('thin', { body: 'A stub.' })]).filter(
      (finding) => finding.code === 'card-wants-demoting',
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ key: 'thin', severity: 'warning' });
  });

  it('leaves a card alone once it earns its tier', () => {
    const withFormula = card('has-formula', {
      body: 'A stub.',
      formula: 'F = 1',
    });
    const withSources = card('has-sources', {
      body: 'A stub.',
      sources: ['hull-options-futures'],
    });
    const withBody = card('has-body', {
      body: Array.from({ length: 30 }, (_, index) => `word${index}`).join(' '),
    });

    const findings = run([withFormula, withSources, withBody]).filter(
      (finding) => finding.code === 'card-wants-demoting',
    );

    expect(findings).toEqual([]);
  });
});

describe('gloss-collides-with-card', () => {
  it('is a build error when a gloss key is also a card key', () => {
    const notationInput: NotationRegistryInput = {
      sharedDefinitions: [
        card('expectation', {
          glosses: resolveGlosses('expectation', [
            { latex: '\\Omega', name: 'sample space' },
          ]),
        }),
        card('expectation.sample-space'),
      ],
      lessons: [],
    };

    const diagnostics = buildNotationRegistry(notationInput).diagnostics.filter(
      (diagnostic) => diagnostic.code === 'gloss-collides-with-card',
    );

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: 'error',
      key: 'expectation.sample-space',
    });
  });

  it('accepts the same letter glossed on two different cards', () => {
    const diagnostics = buildNotationRegistry({
      sharedDefinitions: [
        card('alpha', { glosses: glossesOn('alpha') }),
        card('beta', { glosses: glossesOn('beta') }),
      ],
      lessons: [],
    }).diagnostics.filter(
      (diagnostic) => diagnostic.code === 'gloss-collides-with-card',
    );

    expect(diagnostics).toEqual([]);
  });
});

describe('a gloss is not a graph node', () => {
  it('adds no definition, no reference, and no backlink', () => {
    const notationInput: NotationRegistryInput = {
      sharedDefinitions: [
        card('expectation', {
          formula: '\\mathbb{E}[X]',
          glosses: resolveGlosses('expectation', [
            { latex: 'X', name: 'random variable' },
          ]),
        }),
      ],
      lessons: [],
    };
    const registry = buildNotationRegistry(notationInput);

    // The card is a node; the letter its formula needs is not. This is the
    // property the whole tier exists for: a definitional letter must never
    // become a curriculum edge (see ADR 0002, D15).
    expect(registry.definitions.map((entry) => entry.key)).toEqual([
      'expectation',
    ]);
    expect(
      registry.definitions.flatMap((entry) =>
        entry.resolvedReferences.map((reference) => reference.key),
      ),
    ).toEqual([]);
    expect(registry.backlinks).toEqual([]);
    expect(registry.diagnostics.filter((d) => d.severity === 'error')).toEqual(
      [],
    );
  });
});

describe('gloss-name-shape', () => {
  const named = (name: string) =>
    run([
      card('alpha', {
        glosses: resolveGlosses('alpha', [{ latex: '\\Omega', name }]),
      }),
    ]).filter((finding) => finding.code === 'gloss-name-shape');

  it('accepts the noun phrases a symbol actually gets', () => {
    expect(named('sample space')).toEqual([]);
    expect(named('outcome')).toEqual([]);
    // Six words is the corpus maximum, set by its most complicated quantity.
    expect(named('cds protection buyer net present value')).toEqual([]);
  });

  it('flags a name that has become a description', () => {
    const findings = named('the space of all outcomes the model can produce');
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ severity: 'warning' });
    expect(findings[0]?.message).toContain('9 words');
  });

  it('flags a relative clause even when it is short', () => {
    expect(named('outcome, which the model draws')).toHaveLength(1);
  });
});
