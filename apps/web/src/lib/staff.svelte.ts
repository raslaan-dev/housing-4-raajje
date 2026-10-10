import type { BranchScope } from '@housing/shared';
import { untrack } from 'svelte';
import { errorMessage } from './api';
import { session } from './session.svelte';
import type { IconName } from './components/Icon.svelte';

/** Admins pick a branch scope; everyone else is pinned to their own branch (the API enforces this too). */
export const staffScope = $state<{ value: BranchScope }>({ value: 'all' });

export const isAdmin = () => session.user?.role === 'SYSTEM_ADMIN';

export function scopeParam(): BranchScope {
  if (isAdmin()) return staffScope.value;
  return (session.user?.branch?.name ?? 'all') as BranchScope;
}

export type StaffScreen = 'overview' | 'queue' | 'viewings' | 'matches' | 'leases' | 'inquiries' | 'reports' | 'accounts' | 'audit';

export const SCREENS: Record<StaffScreen, { href: string; label: string; icon: IconName }> = {
  overview: { href: '/staff', label: 'Overview', icon: 'dashboard' },
  queue: { href: '/staff/queue', label: 'Verification queue', icon: 'queue' },
  viewings: { href: '/staff/viewings', label: 'Viewings', icon: 'viewings' },
  matches: { href: '/staff/matches', label: 'Matchmaker', icon: 'matches' },
  leases: { href: '/staff/leases', label: 'Lease execution', icon: 'signature' },
  inquiries: { href: '/staff/inquiries', label: 'Inquiries', icon: 'inquiries' },
  reports: { href: '/staff/reports', label: 'Branch reports', icon: 'reports' },
  accounts: { href: '/staff/accounts', label: 'Staff accounts', icon: 'accounts' },
  audit: { href: '/staff/audit', label: 'Audit log', icon: 'audit' }
};

export const NAV_FOR_ROLE: Record<string, StaffScreen[]> = {
  PROPERTY_SPECIALIST: ['overview', 'queue', 'viewings', 'matches', 'leases'],
  RECEPTIONIST: ['overview', 'inquiries', 'viewings'],
  BRANCH_MANAGER: ['overview', 'reports', 'queue', 'viewings', 'leases'],
  SYSTEM_ADMIN: ['overview', 'accounts', 'audit', 'reports', 'queue']
};

export const canSee = (screen: StaffScreen) => (NAV_FOR_ROLE[session.user?.role ?? ''] ?? []).includes(screen);

/** Like resource(), but refetches whenever the admin changes branch scope. */
export function scoped<T>(fetcher: (branch: BranchScope) => Promise<T>) {
  const state = $state<{ data: T | undefined; error: string | null; loading: boolean }>({
    data: undefined,
    error: null,
    loading: true
  });
  let seq = 0;

  async function load(branch: BranchScope) {
    const mine = ++seq;
    state.loading = true;
    state.error = null;
    try {
      const data = await fetcher(branch);
      if (mine === seq) state.data = data;
    } catch (e) {
      if (mine === seq) state.error = errorMessage(e);
    } finally {
      if (mine === seq) state.loading = false;
    }
  }

  $effect(() => {
    const branch = scopeParam();
    untrack(() => load(branch));
  });

  return {
    get data() {
      return state.data;
    },
    get error() {
      return state.error;
    },
    get loading() {
      return state.loading;
    },
    reload: () => load(scopeParam()),
    set(value: T) {
      state.data = value;
    }
  };
}
