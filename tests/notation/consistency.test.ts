import { describe, expect, it } from 'vitest';

import {
  compileManifest,
  MANIFEST_SCHEMA_VERSION,
} from 'explico/compiler/manifest';
import { buildResolutionReports } from 'explico/compiler/resolution-report';
import {
  consistencyCounts,
  runConsistencyChecks,
  type ConsistencyCode,
} from 'explico/reference/consistency';
import { loadNotationSpecs } from 'explico/compiler/collections';
import { parseLintIgnore } from 'explico/reference/lint-ignore';
import {
  offVocabularyTokens,
  unitsTokens,
} from 'explico/reference/units-vocab';
import { buildNotationRegistry } from 'explico/reference/registry';
import { loadNotationRegistryInput } from 'explico/compiler/collections';
import { loadCurriculumCatalog } from 'explico/compiler/collections';
import { courseConfig } from '../../content/course.config';

const NO_IGNORE = { entries: [], matches: () => false };
const CONVENTIONS = courseConfig.conventions;

describe('units vocabulary', () => {
  it('splits on whitespace and internal hyphens, drops bare numbers', () => {
    expect(
      unitsTokens('current-node currency per 2 next-time currency'),
    ).toEqual([
      'current',
      'node',
      'currency',
      'per',
      'next',
      'time',
      'currency',
    ]);
  });

  it('accepts an established phrase and flags off-vocabulary words', () => {
    expect(offVocabularyTokens('stated currency at valuation time')).toEqual(
      [],
    );
    expect(
      offVocabularyTokens('USD at the pricing horizon in this lesson'),
    ).toEqual(['usd', 'pricing', 'lesson']);
  });
});

describe('lint-ignore registry', () => {
  it('parses "<code>[:<detail>] — <reason>" lines and comments', () => {
    const entries = parseLintIgnore(
      [
        '# a comment',
        '',
        '- glyph-unique-in-corpus:n — page-local index, rescoped per lesson',
        '- weak-local -- broad acknowledgement',
      ].join('\n'),
    );
    expect(entries).toEqual([
      {
        code: 'glyph-unique-in-corpus',
        detail: 'n',
        reason: 'page-local index, rescoped per lesson',
      },
      { code: 'weak-local', reason: 'broad acknowledgement' },
    ]);
  });

  it('rejects a malformed line', () => {
    expect(() => parseLintIgnore('- not a valid entry')).toThrow(/lint-ignore/);
  });
});

describe('runConsistencyChecks (real corpus)', () => {
  it('produces only warnings, and a lint-ignore entry suppresses a finding', async () => {
    const [notationInput, catalog] = await Promise.all([
      loadNotationRegistryInput(),
      loadCurriculumCatalog(),
    ]);
    const registry = buildNotationRegistry(notationInput);
    const specs = loadNotationSpecs();

    const all = runConsistencyChecks({
      registry,
      notationInput,
      specs,
      catalog,
      lintIgnore: NO_IGNORE,
      conventions: CONVENTIONS,
    });
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((d) => d.severity === 'warning')).toBe(true);

    // `n` is a known cross-page glyph collision; acknowledging it drops it.
    const withIgnore = runConsistencyChecks({
      registry,
      notationInput,
      specs,
      catalog,
      lintIgnore: {
        entries: [],
        matches: (code, detail) =>
          code === 'glyph-unique-in-corpus' && detail === 'n',
      },
      conventions: CONVENTIONS,
    });
    expect(
      all.some((d) => d.code === 'glyph-unique-in-corpus' && d.glyph === 'n'),
    ).toBe(true);
    expect(
      withIgnore.some(
        (d) => d.code === 'glyph-unique-in-corpus' && d.glyph === 'n',
      ),
    ).toBe(false);
  });

  it('is stable across two runs', async () => {
    const [notationInput, catalog] = await Promise.all([
      loadNotationRegistryInput(),
      loadCurriculumCatalog(),
    ]);
    const registry = buildNotationRegistry(notationInput);
    const specs = loadNotationSpecs();
    const input = {
      registry,
      notationInput,
      specs,
      catalog,
      lintIgnore: NO_IGNORE,
      conventions: CONVENTIONS,
    };
    expect(JSON.stringify(runConsistencyChecks(input))).toBe(
      JSON.stringify(runConsistencyChecks(input)),
    );
  });
});

describe('manifest D6 additions', () => {
  it('records consistency diagnostics and per-lesson resolution rows', async () => {
    const manifest = await compileManifest(courseConfig);
    expect(manifest.schemaVersion).toBe(MANIFEST_SCHEMA_VERSION);

    const { consistency } = manifest.diagnostics;
    expect(Array.isArray(consistency)).toBe(true);
    expect(consistency.every((d) => d.severity === 'warning')).toBe(true);

    const counts = consistencyCounts(consistency);
    const codes = Object.keys(counts) as ConsistencyCode[];
    expect(codes.sort()).toEqual(
      [
        'card-wants-demoting',
        'convention-single-definition',
        'gloss-name-shape',
        'gloss-wants-promoting',
        'glyph-unique-in-corpus',
        'notation-source-locator',
        'notation-units',
        'numerals-tagged',
        'operator-explained',
        'units-vocab',
        'weak-local',
      ].sort(),
    );
    expect(Object.values(counts).reduce((sum, n) => sum + n, 0)).toBe(
      consistency.length,
    );

    const lesson = manifest.lessons.find(
      (entry) => entry.id === 'foundations.discount-factors',
    );
    expect(lesson?.notation.resolution.length).toBeGreaterThan(0);
    for (const row of lesson?.notation.resolution ?? []) {
      expect(['shared', 'local', 'unresolved']).toContain(row.scope);
      expect(row.key.length).toBeGreaterThan(0);
    }
  });

  it('builds one resolution report per lesson plus the consistency report, deterministically', async () => {
    const manifest = await compileManifest(courseConfig);
    const a = buildResolutionReports(manifest);
    const b = buildResolutionReports(manifest);

    expect(a.size).toBe(manifest.lessons.length + 1);
    expect(a.has('build/resolution/consistency-report.json')).toBe(true);
    for (const [path, content] of a) {
      expect(content).toBe(b.get(path));
      expect(content.endsWith('\n')).toBe(true);
    }
  });
});
