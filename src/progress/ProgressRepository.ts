/**
 * The learning-progress seam (Phase H1).
 *
 * Nothing is implemented behind this interface. `noopProgressRepository` is the
 * only implementation the static site ships: `load` returns an empty snapshot,
 * `recordAttempt` / `reset` do nothing. Assessment components call it on every
 * result so a future host — an SSR app, an LMS importer, or the MCP server that
 * already consumes `.generated/manifest.json` (see `docs/architecture.md`
 * §15) — can supply a real repository (a versioned browser-storage adapter
 * first, a server store later) without changing a single component.
 *
 * This module is framework-free: it imports no React, Astro, content, or
 * browser API, and it reads no browser storage. The first real adapter is the
 * only place a storage call will live.
 */

import type { SessionUser } from '../session/user';

/**
 * The per-competency progress ladder from `docs/architecture.md` §3. Unused by
 * the no-op impl; part of the contract a real repository fills in.
 */
export type CompetencyProgressState =
  'unseen' | 'exposed' | 'practicing' | 'demonstrated' | 'refresh_due';

/** One recorded answer to one assessment item. */
export interface AssessmentAttempt {
  readonly assessmentId: string;
  readonly itemId: string;
  readonly competencyId?: string;
  readonly evidenceKind: 'direct' | 'transfer';
  readonly outcome: 'correct' | 'incorrect';
  /** Epoch milliseconds; the caller supplies it so this stays side-effect-free. */
  readonly at: number;
}

export interface ProgressSnapshot {
  readonly attempts: readonly AssessmentAttempt[];
  readonly states: Readonly<Record<string, CompetencyProgressState>>;
}

export interface ProgressRepository {
  /** Everything known for this viewer. The no-op impl returns {@link EMPTY_PROGRESS}. */
  load(user: SessionUser): ProgressSnapshot | Promise<ProgressSnapshot>;
  /** Persist one attempt. The no-op impl discards it. */
  recordAttempt(
    user: SessionUser,
    attempt: AssessmentAttempt,
  ): void | Promise<void>;
  /** Clear stored attempts, optionally scoped to one assessment or item. */
  reset(
    user: SessionUser,
    scope?: { readonly assessmentId?: string; readonly itemId?: string },
  ): void | Promise<void>;
}

export const EMPTY_PROGRESS: ProgressSnapshot = { attempts: [], states: {} };

/** The only implementation in the static build. */
export const noopProgressRepository: ProgressRepository = {
  load: () => EMPTY_PROGRESS,
  recordAttempt: () => {},
  reset: () => {},
};
