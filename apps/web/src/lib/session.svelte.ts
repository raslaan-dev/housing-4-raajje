import type { SessionUser } from '@housing/shared';

const KEY = 'h4r.session';

function read(): SessionUser | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export const session = $state<{ user: SessionUser | null; ready: boolean }>({ user: null, ready: false });

export function loadSession() {
  session.user = read();
  session.ready = true;
}

export function signIn(user: SessionUser) {
  session.user = user;
  try {
    localStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    /* Storage unavailable: the session lasts for this tab only. */
  }
}

export function signOut() {
  session.user = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* Nothing stored. */
  }
}

export const PORTAL_FOR_ROLE: Record<string, string> = {
  CLIENT: '/client',
  OWNER: '/owner',
  SYSTEM_ADMIN: '/staff',
  BRANCH_MANAGER: '/staff',
  PROPERTY_SPECIALIST: '/staff',
  RECEPTIONIST: '/staff'
};
