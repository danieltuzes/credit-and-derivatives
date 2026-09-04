/**
 * Installed-engine seam smoke tests (H1).
 *
 * The engine ships LMS / analytics / identity as framework-free no-op seams; a
 * host swaps in real implementations without touching a component. These check
 * that the seams the course consumes from the published `explico` package are
 * wired and behave as no-ops. The source-level invariants — the one sanctioned
 * browser-storage touch-point, the seam modules staying framework-free — live
 * in the `explico` repo alongside the code they guard.
 */

import { describe, expect, it } from 'vitest';

import { noopAnalyticsEmitter } from 'explico/analytics/AnalyticsEmitter';
import {
  EMPTY_PROGRESS,
  noopProgressRepository,
  type AssessmentAttempt,
} from 'explico/progress/ProgressRepository';
import { createMemoryPreferenceStore } from 'explico/session/PreferenceStore';
import { anonymousUser, isAnonymous } from 'explico/session/user';

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
