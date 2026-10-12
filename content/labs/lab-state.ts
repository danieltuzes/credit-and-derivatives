/**
 * One lab's inputs, shared by its two islands on a page (rule V3): the
 * figure's picture (the plot, which also writes the case it shows at the end
 * of the caption) and its tools (the controls, after the caption). Each
 * island is a React root of its own, so React state cannot cross between
 * them. Both import their lab's module, which the browser loads once per
 * page, so the store a lab makes here at module level is the one both use.
 *
 * The inputs live in memory only, as they always have: a reload starts from
 * the defaults, and no lab touches browser storage (docs/architecture.md,
 * "Progress"). The server renders the defaults, and hydration starts from
 * them (`getServerSnapshot`), so the built page and an island's first client
 * render agree even when a reader has moved a control before the other
 * island hydrates; React then renders the current values.
 */
import { useSyncExternalStore } from 'react';

export type LabState<T> = readonly [T, (change: Partial<T>) => void];

export function createLabState<T extends object>(
  defaults: T,
): () => LabState<T> {
  let current = defaults;
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const snapshot = () => current;
  const serverSnapshot = () => defaults;
  const update = (change: Partial<T>) => {
    current = { ...current, ...change };
    for (const listener of listeners) listener();
  };
  return function useLabState(): LabState<T> {
    return [useSyncExternalStore(subscribe, snapshot, serverSnapshot), update];
  };
}
