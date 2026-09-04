import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { noopAnalyticsEmitter } from 'explico/analytics/AnalyticsEmitter';
import {
  EMPTY_PROGRESS,
  noopProgressRepository,
  type AssessmentAttempt,
} from 'explico/progress/ProgressRepository';
import { createMemoryPreferenceStore } from 'explico/session/PreferenceStore';
import { anonymousUser, isAnonymous } from 'explico/session/user';

// The engine source (Phase F2: the `explico` workspace package).
const SRC = join(process.cwd(), 'packages', 'explico', 'src');

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(path);
    return entry.isFile() ? [path] : [];
  });
}

describe('viewer identity seam (H1)', () => {
  it('is always anonymous with a null id', () => {
    expect(anonymousUser).toEqual({ kind: 'anonymous', id: null });
    expect(isAnonymous(anonymousUser)).toBe(true);
  });
});

describe('no-op progress repository (H1)', () => {
  const attempt: AssessmentAttempt = {
    assessmentId: 'discount-factor-check',
    itemId: 'df-meaning-direct',
    evidenceKind: 'direct',
    outcome: 'correct',
    at: 0,
  };

  it('load returns an empty snapshot', async () => {
    await expect(
      Promise.resolve(noopProgressRepository.load(anonymousUser)),
    ).resolves.toEqual(EMPTY_PROGRESS);
    expect(EMPTY_PROGRESS.attempts).toEqual([]);
    expect(EMPTY_PROGRESS.states).toEqual({});
  });

  it('recordAttempt and reset are side-effect-free and never throw', async () => {
    await expect(
      Promise.resolve(
        noopProgressRepository.recordAttempt(anonymousUser, attempt),
      ),
    ).resolves.toBeUndefined();
    await expect(
      Promise.resolve(
        noopProgressRepository.reset(anonymousUser, {
          assessmentId: attempt.assessmentId,
          itemId: attempt.itemId,
        }),
      ),
    ).resolves.toBeUndefined();
    // A second load still sees nothing — the no-op stored nothing.
    await expect(
      Promise.resolve(noopProgressRepository.load(anonymousUser)),
    ).resolves.toEqual(EMPTY_PROGRESS);
  });
});

describe('no-op analytics emitter (H1)', () => {
  it('emit accepts an event and does nothing', () => {
    expect(() =>
      noopAnalyticsEmitter.emit({ name: 'assessment.attempt', at: 0 }),
    ).not.toThrow();
  });
});

describe('preference store seam (H1)', () => {
  it('the memory store round-trips and returns null for a missing key', () => {
    const store = createMemoryPreferenceStore();
    expect(store.get('layout:nav')).toBeNull();
    store.set('layout:nav', 'true');
    expect(store.get('layout:nav')).toBe('true');
  });
});

describe('browser-storage boundary (H1)', () => {
  const sources = filesUnder(SRC).filter((path) =>
    /\.(ts|tsx|astro|mjs)$/.test(path),
  );
  // A real access — `localStorage.getItem`, `sessionStorage[`, `document.cookie`
  // — not a prose mention in a doc comment.
  const STORAGE_ACCESS =
    /(?:localStorage|sessionStorage|indexedDB)\s*[.[]|document\s*\.\s*cookie/;

  it('no component reaches for browser storage directly', () => {
    const offenders = filesUnder(join(SRC, 'components')).filter(
      (path) =>
        /\.(ts|tsx|astro|mjs)$/.test(path) &&
        STORAGE_ACCESS.test(readFileSync(path, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('a browser-storage access appears only in the PreferenceStore adapter', () => {
    const matches = sources.filter((path) =>
      STORAGE_ACCESS.test(readFileSync(path, 'utf8')),
    );
    expect(matches).toEqual([join(SRC, 'session', 'PreferenceStore.ts')]);
  });
});

describe('seam modules are framework-free (H1)', () => {
  // The PreferenceStore browser adapter is deliberately excluded — it is the
  // one sanctioned `window.localStorage` touch-point.
  const modules = [
    'progress/ProgressRepository.ts',
    'analytics/AnalyticsEmitter.ts',
    'session/user.ts',
  ];

  it('import no React, Astro, content, or browser API', () => {
    for (const relPath of modules) {
      const source = readFileSync(join(SRC, relPath), 'utf8');
      expect(source).not.toMatch(/from ['"](react|astro|astro:)/);
      expect(source).not.toMatch(
        /(?:localStorage|sessionStorage)\s*[.[]|\bwindow\s*\.\s*\w/,
      );
    }
  });
});
