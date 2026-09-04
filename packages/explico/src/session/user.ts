/**
 * The viewer identity seam (Phase H1).
 *
 * The static site has no accounts and no sign-in: every viewer is anonymous.
 * A future SSR app or LMS host is the only thing that would ever supply a real
 * identity, and it would do so by wrapping the React tree in a provider over
 * {@link SessionUserContext} (see `./user-context`). Nothing in this repository
 * produces a non-anonymous user, and nothing here reads a cookie, a token, or
 * browser storage.
 */

export interface SessionUser {
  /** Always `'anonymous'` in the static build. */
  readonly kind: 'anonymous';
  /** A stable id for a signed-in viewer; always `null` here. */
  readonly id: string | null;
}

/** The only user the static site ever has. */
export const anonymousUser: SessionUser = { kind: 'anonymous', id: null };

export function isAnonymous(user: SessionUser): boolean {
  return user.kind === 'anonymous' || user.id === null;
}
