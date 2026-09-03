/**
 * React binding for the viewer identity seam (Phase H1).
 *
 * `SessionUserContext` defaults to {@link anonymousUser}. The static site never
 * wraps a provider around it, so `useSessionUser()` always returns the
 * anonymous user; a future SSR/LMS host injects a real identity here without
 * touching any consumer.
 */

import { createContext, useContext } from 'react';

import { anonymousUser, type SessionUser } from './user';

export const SessionUserContext = createContext<SessionUser>(anonymousUser);

export function useSessionUser(): SessionUser {
  return useContext(SessionUserContext);
}
