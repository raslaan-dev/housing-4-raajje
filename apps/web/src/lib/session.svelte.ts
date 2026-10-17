import type { SessionUser } from '@housing/shared';

const KEY = 'h4r.session';

type StoredSession = { user: SessionUser; token: string | null };

function read(): StoredSession | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionUser | Partial<StoredSession>;
    if ('user' in parsed && parsed.user) return { user: parsed.user, token: parsed.token ?? null };
    return { user: parsed as SessionUser, token: null };
  } catch {
    return null;
  }
}

export const session = $state<{ user: SessionUser | null; token: string | null; ready: boolean }>({ user: null, token: null, ready: false });

export function loadSession() {
  const stored = read();
  session.user = stored?.user ?? null;
  session.token = stored?.token ?? null;
  session.ready = true;
}

export function signIn(user: SessionUser, token?: string) {
  session.user = user;
  session.token = token ?? null;
  try {
    localStorage.setItem(KEY, JSON.stringify({ user, token: session.token }));
  } catch {
    /* Storage unavailable: the session lasts for this tab only. */
  }
}

export function signOut() {
  session.user = null;
  session.token = null;
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
