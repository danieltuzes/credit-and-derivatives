import { describe, expect, it } from 'vitest';
import {
  compileManifest,
  MANIFEST_SCHEMA_VERSION,
  serializeManifest,
} from '../../src/content/manifest';

describe('content manifest (Phase D5)', () => {
  it('compiles deterministically — two runs are byte-identical', async () => {
    const [first, second] = await Promise.all([
      compileManifest(),
      compileManifest(),
    ]);
    expect(serializeManifest(first)).toBe(serializeManifest(second));
  });

  it('serializes with recursively sorted object keys', async () => {
    const manifest = await compileManifest();
    const text = serializeManifest(manifest);
    const topKeys = Object.keys(JSON.parse(text) as Record<string, unknown>);
    expect(topKeys).toEqual([...topKeys].sort());
    expect(text.endsWith('\n')).toBe(true);
  });

  it('carries the schema version and the core collections', async () => {
    const manifest = await compileManifest();
    expect(manifest.schemaVersion).toBe(MANIFEST_SCHEMA_VERSION);
    expect(manifest.lessons.length).toBeGreaterThan(0);
    expect(manifest.competencies.length).toBeGreaterThan(0);
    expect(manifest.sources.length).toBeGreaterThan(0);
    expect(manifest.notation.definitions.length).toBeGreaterThan(0);
    expect(manifest.sidebar.length).toBeGreaterThan(0);
    expect(manifest.hashes.contentTree).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('gives every lesson a resolved notation bundle and derived metadata', async () => {
    const manifest = await compileManifest();
    const lesson = manifest.lessons.find(
      (entry) => entry.id === 'foundations.discount-factors',
    );
    expect(lesson).toBeDefined();
    expect(lesson?.title.length).toBeGreaterThan(0);
    expect(lesson?.requires).toEqual(['rates.periodic-rate.calculate']);
    expect(lesson?.assessments).toEqual(['discount-factor-check']);
    expect(lesson?.sources).toEqual([
      'hull-options-futures',
      'tuckman-serrat-fixed-income',
    ]);
    // The lesson references the shared discount-factor entry, so its resolved
    // bundle must include it.
    const keys = lesson?.notation.definitions.map((d) => d.key) ?? [];
    expect(keys).toContain('discount-factor');
    for (const definition of lesson?.notation.definitions ?? []) {
      expect(
        definition.scope === 'shared' || definition.scope === 'local',
      ).toBe(true);
      expect(definition.summary.length).toBeGreaterThan(0);
    }
  });

  it('exposes the notation registry and diagnostics without a page-time rebuild', async () => {
    const manifest = await compileManifest();
    expect(
      manifest.notation.diagnostics.filter((d) => d.severity === 'error'),
    ).toEqual([]);
    expect(
      manifest.diagnostics.curriculum.filter((i) => i.severity !== 'warning'),
    ).toEqual([]);
    expect(
      manifest.diagnostics.math.filter((i) => i.severity === 'error'),
    ).toEqual([]);
    expect(
      manifest.diagnostics.equations.filter((i) => i.severity === 'error'),
    ).toEqual([]);
    expect(Array.isArray(manifest.prereqEdges)).toBe(true);
  });
});
