import { describe, expect, it } from 'vitest';
import {
  assertValidNotation,
  buildNotationRegistry,
} from '../../src/notation/registry';
import type {
  LocalNotationDefinitionInput,
  NotationDiagnosticCode,
  NotationLessonInput,
  NotationReferenceInput,
  SharedNotationDefinitionInput,
} from '../../src/notation/types';

const reference = (
  key: string,
  file: string,
  kind: NotationReferenceInput['kind'] = 'definition',
): NotationReferenceInput => ({ key, kind, source: { file } });

const sharedDefinition = (
  key: string,
  overrides: Partial<SharedNotationDefinitionInput> = {},
): SharedNotationDefinitionInput => ({
  key,
  notation: key,
  title: key,
  aliases: [],
  domain: 'test',
  sources: [],
  seeAlso: [],
  alignment: {
    kind: 'general',
    rationale: 'Test fixture with no curriculum owner.',
  },
  status: 'draft',
  aiAssisted: false,
  body: '',
  references: [],
  source: { file: `notation/${key}.md` },
  ...overrides,
});

const localDefinition = (
  key: string,
  lessonId: string,
  overrides: Partial<LocalNotationDefinitionInput> = {},
): LocalNotationDefinitionInput => ({
  key,
  notation: key,
  title: key,
  summary: `${key} on this page`,
  sources: [],
  seeAlso: [],
  alignment: {
    kind: 'general',
    rationale: 'Test fixture with page-local meaning.',
  },
  references: [],
  source: { file: `lessons/${lessonId}.mdx` },
  ...overrides,
});

const lesson = (
  lessonId: string,
  overrides: Partial<NotationLessonInput> = {},
): NotationLessonInput => ({
  lessonId,
  status: 'draft',
  uses: [],
  localDefinitions: [],
  references: [],
  body: '',
  source: { file: `lessons/${lessonId}.mdx` },
  ...overrides,
});

const codes = (
  diagnostics: readonly { code: NotationDiagnosticCode }[],
): NotationDiagnosticCode[] => diagnostics.map(({ code }) => code);

describe('notation registry', () => {
  it('lets a page-local definition shadow a shared key without importing itself', () => {
    const lessonId = 'rates.local-convention';
    const registry = buildNotationRegistry({
      sharedDefinitions: [sharedDefinition('rate')],
      lessons: [
        lesson(lessonId, {
          localDefinitions: [localDefinition('rate', lessonId)],
          references: [reference('rate', `lessons/${lessonId}.mdx`, 'math')],
        }),
      ],
    });

    const bundle = registry.bundles[0];
    expect(bundle?.bindings).toEqual([
      { key: 'rate', definitionId: `page:${lessonId}:rate` },
    ]);
    expect(bundle?.definitionIds).toEqual([`page:${lessonId}:rate`]);
    expect(codes(registry.diagnostics)).not.toContain('undeclared-reference');
    expect(registry.backlinks).toContainEqual({
      definitionId: `page:${lessonId}:rate`,
      key: 'rate',
      lessonId,
      direct: true,
    });
  });

  it('keeps shared definition bodies in shared scope when a page shadows a dependency', () => {
    const lessonId = 'rates.shared-closure';
    const registry = buildNotationRegistry({
      sharedDefinitions: [
        sharedDefinition('curve', {
          references: [reference('rate', 'notation/curve.md')],
        }),
        sharedDefinition('rate'),
      ],
      lessons: [
        lesson(lessonId, {
          uses: ['curve'],
          localDefinitions: [localDefinition('rate', lessonId)],
          references: [reference('curve', `lessons/${lessonId}.mdx`, 'prose')],
        }),
      ],
    });

    expect(
      registry.definitions.find(({ id }) => id === 'shared:curve')
        ?.resolvedReferences,
    ).toEqual([
      expect.objectContaining({
        key: 'rate',
        definitionId: 'shared:rate',
      }),
    ]);
    expect(registry.bundles[0]?.definitionIds).toEqual([
      'shared:curve',
      'shared:rate',
    ]);
    expect(registry.bundles[0]?.definitionIds).not.toContain(
      `page:${lessonId}:rate`,
    );
  });

  it('resolves local seeAlso through page scope and counts a shared import as used', () => {
    const lessonId = 'rates.local-see-also';
    const registry = buildNotationRegistry({
      sharedDefinitions: [sharedDefinition('discount-factor')],
      lessons: [
        lesson(lessonId, {
          uses: ['discount-factor'],
          localDefinitions: [
            localDefinition('local-factor', lessonId, {
              seeAlso: ['discount-factor'],
            }),
          ],
          references: [
            reference('local-factor', `lessons/${lessonId}.mdx`, 'prose'),
          ],
        }),
      ],
    });

    expect(registry.bundles[0]?.definitionIds).toEqual([
      `page:${lessonId}:local-factor`,
    ]);
    expect(codes(registry.diagnostics)).not.toContain('undeclared-reference');
    expect(codes(registry.diagnostics)).not.toContain('undefined-reference');
    expect(codes(registry.diagnostics)).not.toContain('unused-use');
  });

  it('requires a local seeAlso target in shared scope to be imported', () => {
    const lessonId = 'rates.undeclared-see-also';
    const registry = buildNotationRegistry({
      sharedDefinitions: [sharedDefinition('discount-factor')],
      lessons: [
        lesson(lessonId, {
          localDefinitions: [
            localDefinition('local-factor', lessonId, {
              seeAlso: ['discount-factor'],
            }),
          ],
          references: [
            reference('local-factor', `lessons/${lessonId}.mdx`, 'prose'),
          ],
        }),
      ],
    });

    expect(registry.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'undeclared-reference',
        key: 'discount-factor',
        lessonId,
        definitionId: `page:${lessonId}:local-factor`,
      }),
    );
    expect(registry.bundles[0]?.definitionIds).toEqual([
      `page:${lessonId}:local-factor`,
    ]);
  });

  it('lets a local seeAlso target shadow a shared definition without an import', () => {
    const lessonId = 'rates.shadowed-see-also';
    const registry = buildNotationRegistry({
      sharedDefinitions: [sharedDefinition('rate')],
      lessons: [
        lesson(lessonId, {
          localDefinitions: [
            localDefinition('local-summary', lessonId, {
              seeAlso: ['rate'],
            }),
            localDefinition('rate', lessonId),
          ],
          references: [
            reference('local-summary', `lessons/${lessonId}.mdx`, 'prose'),
          ],
        }),
      ],
    });

    expect(registry.bundles[0]?.definitionIds).toEqual([
      `page:${lessonId}:local-summary`,
    ]);
    expect(codes(registry.diagnostics)).not.toContain('undeclared-reference');
  });

  it('requires direct shared references to be declared by the lesson', () => {
    const registry = buildNotationRegistry({
      sharedDefinitions: [sharedDefinition('discount-factor')],
      lessons: [
        lesson('rates.discounting', {
          references: [
            reference(
              'discount-factor',
              'lessons/rates.discounting.mdx',
              'prose',
            ),
          ],
        }),
      ],
    });

    expect(registry.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'undeclared-reference',
        key: 'discount-factor',
        lessonId: 'rates.discounting',
      }),
    );
    expect(registry.bundles[0]?.bindings).toEqual([]);
    expect(() => assertValidNotation(registry)).toThrow(/undeclared-reference/);
  });

  it('builds transitive page bundles and distinguishes direct backlinks', () => {
    const registry = buildNotationRegistry({
      sharedDefinitions: [
        sharedDefinition('bond-price', {
          references: [reference('present-value', 'notation/bond-price.md')],
        }),
        sharedDefinition('discount-factor'),
        sharedDefinition('present-value', {
          references: [
            reference('discount-factor', 'notation/present-value.md'),
          ],
        }),
      ],
      lessons: [
        lesson('bonds.price', {
          uses: ['bond-price'],
          references: [
            reference('bond-price', 'lessons/bonds.price.mdx', 'math'),
          ],
        }),
      ],
    });

    expect(registry.bundles[0]).toMatchObject({
      lessonId: 'bonds.price',
      declaredUses: ['bond-price'],
      bindings: [{ key: 'bond-price', definitionId: 'shared:bond-price' }],
      definitionIds: [
        'shared:bond-price',
        'shared:discount-factor',
        'shared:present-value',
      ],
    });
    expect(registry.backlinks).toEqual([
      {
        definitionId: 'shared:bond-price',
        key: 'bond-price',
        lessonId: 'bonds.price',
        direct: true,
      },
      {
        definitionId: 'shared:discount-factor',
        key: 'discount-factor',
        lessonId: 'bonds.price',
        direct: false,
      },
      {
        definitionId: 'shared:present-value',
        key: 'present-value',
        lessonId: 'bonds.price',
        direct: false,
      },
    ]);
    expect(registry.diagnostics).toEqual([]);
    expect(() => assertValidNotation(registry)).not.toThrow();
  });

  it('accepts reciprocal shared seeAlso without adding dependency edges', () => {
    const registry = buildNotationRegistry({
      sharedDefinitions: [
        sharedDefinition('bond-price', {
          seeAlso: ['present-value'],
        }),
        sharedDefinition('present-value', {
          seeAlso: ['bond-price'],
        }),
      ],
      lessons: [
        lesson('bonds.price-see-also', {
          uses: ['bond-price'],
          references: [
            reference('bond-price', 'lessons/bonds.price-see-also.mdx', 'math'),
          ],
        }),
      ],
    });

    expect(registry.bundles[0]?.definitionIds).toEqual(['shared:bond-price']);
    expect(registry.backlinks).not.toContainEqual(
      expect.objectContaining({ definitionId: 'shared:present-value' }),
    );
    expect(codes(registry.diagnostics)).not.toContain('reference-cycle');
    expect(codes(registry.diagnostics)).not.toContain('undefined-reference');
  });

  it('reports unknown declarations and unknown definition references once', () => {
    const registry = buildNotationRegistry({
      sharedDefinitions: [
        sharedDefinition('known', {
          references: [reference('missing-dependency', 'notation/known.md')],
        }),
      ],
      lessons: [
        lesson('lesson.unknown', {
          uses: ['missing-page-key'],
          references: [
            reference(
              'missing-page-key',
              'lessons/lesson.unknown.mdx',
              'prose',
            ),
          ],
        }),
      ],
    });

    const undefinedDiagnostics = registry.diagnostics.filter(
      ({ code }) => code === 'undefined-reference',
    );
    expect(undefinedDiagnostics).toHaveLength(2);
    expect(undefinedDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          definitionId: 'shared:known',
          key: 'missing-dependency',
        }),
        expect.objectContaining({
          lessonId: 'lesson.unknown',
          key: 'missing-page-key',
        }),
      ]),
    );
  });

  it('reports reference cycles with a stable closed path', () => {
    const registry = buildNotationRegistry({
      sharedDefinitions: [
        sharedDefinition('zeta', {
          references: [reference('alpha', 'notation/zeta.md')],
        }),
        sharedDefinition('alpha', {
          references: [reference('zeta', 'notation/alpha.md')],
        }),
      ],
      lessons: [],
    });

    expect(registry.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'reference-cycle',
        path: ['shared:alpha', 'shared:zeta', 'shared:alpha'],
      }),
    );
  });

  it('reports unknown shared and local seeAlso targets', () => {
    const lessonId = 'rates.unknown-local-see-also';
    const registry = buildNotationRegistry({
      sharedDefinitions: [
        sharedDefinition('known', { seeAlso: ['missing-dependency'] }),
      ],
      lessons: [
        lesson(lessonId, {
          localDefinitions: [
            localDefinition('local-known', lessonId, {
              seeAlso: ['missing-local-dependency'],
            }),
          ],
          references: [
            reference('local-known', `lessons/${lessonId}.mdx`, 'prose'),
          ],
        }),
      ],
    });

    expect(
      registry.diagnostics.filter(({ code }) => code === 'undefined-reference'),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          definitionId: 'shared:known',
          key: 'missing-dependency',
        }),
        expect.objectContaining({
          definitionId: `page:${lessonId}:local-known`,
          key: 'missing-local-dependency',
          lessonId,
        }),
      ]),
    );
  });

  it('distinguishes duplicate and conflicting definitions', () => {
    const duplicate = sharedDefinition('rate');
    const conflicting = sharedDefinition('rate', {
      title: 'A different meaning',
      source: { file: 'notation/zz-rate-conflict.md' },
    });
    const registry = buildNotationRegistry({
      sharedDefinitions: [
        duplicate,
        { ...duplicate, source: { file: 'notation/rate-copy.md' } },
        conflicting,
      ],
      lessons: [],
    });

    expect(codes(registry.diagnostics)).toEqual(
      expect.arrayContaining([
        'duplicate-definition',
        'conflicting-definition',
      ]),
    );
  });

  it('reports duplicate lessons, duplicate imports, and unused declarations', () => {
    const first = lesson('lesson.duplicates', {
      uses: ['rate', 'rate'],
    });
    const registry = buildNotationRegistry({
      sharedDefinitions: [sharedDefinition('rate')],
      lessons: [first, { ...first, source: { file: 'lessons/duplicate.mdx' } }],
    });

    expect(registry.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'duplicate-page' }),
        expect.objectContaining({ code: 'duplicate-use', key: 'rate' }),
        expect.objectContaining({
          code: 'unused-use',
          severity: 'warning',
          key: 'rate',
        }),
      ]),
    );
  });
});
