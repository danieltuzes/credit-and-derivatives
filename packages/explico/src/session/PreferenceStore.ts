/**
 * The per-viewer UI-preference seam (Phase H1).
 *
 * A "preference" is a small, non-authoritative bit of view state — which layout
 * rails a viewer collapsed, say. It is **not** learning progress (that is the
 * {@link ProgressRepository} seam) and never carries content or identity.
 *
 * This is the single module in the codebase allowed to touch browser storage.
 * Components import a `PreferenceStore`; they never call `localStorage`
 * directly, so a future SSR host can pass `memoryPreferenceStore` (or a
 * cookie-backed store) and nothing else changes. `createBrowserPreferenceStore`
 * is the "versioned local-storage adapter" the architecture doc anticipates —
 * kept deliberately tiny, and the only place `git grep localStorage` matches.
 */

export interface PreferenceStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

/**
 * A `localStorage`-backed store. Every call is wrapped: storage can be absent
 * (SSR), disabled, or full, and the caller must degrade gracefully — the UI
 * controls still work, they just do not persist.
 */
export function createBrowserPreferenceStore(): PreferenceStore {
  return {
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Storage unavailable or full — the control still works this session.
      }
    },
  };
}

/** An in-memory store — the no-op-equivalent seam for SSR or tests. */
export function createMemoryPreferenceStore(): PreferenceStore {
  const map = new Map<string, string>();
  return {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => {
      map.set(key, value);
    },
  };
}
