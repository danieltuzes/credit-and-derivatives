/**
 * The analytics seam (Phase H1).
 *
 * `noopAnalyticsEmitter` is the only sink the static site ships — `emit` does
 * nothing. Stateful components call it alongside the {@link ProgressRepository}
 * so a future host can route interaction events somewhere real without touching
 * a component. Framework-free: no React, Astro, content, or browser API, and no
 * network call.
 */

export interface AnalyticsEvent {
  readonly name: string;
  /** Epoch milliseconds, supplied by the caller so this stays side-effect-free. */
  readonly at: number;
  readonly props?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface AnalyticsEmitter {
  emit(event: AnalyticsEvent): void;
}

/** The only sink in the static build. */
export const noopAnalyticsEmitter: AnalyticsEmitter = { emit: () => {} };
