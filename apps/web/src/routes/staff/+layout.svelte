<script lang="ts">
  import type { Snippet } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { session } from '$lib/session.svelte';
  import { NAV_FOR_ROLE, SCREENS, staffScope, type StaffScreen } from '$lib/staff.svelte';
  import { branchLabel, ROLE_LABEL } from '$lib/format';
  import PortalShell from '$lib/components/PortalShell.svelte';
  import RoleGate from '$lib/components/RoleGate.svelte';

  let { children }: { children: Snippet } = $props();

  const STAFF_ROLES = ['SYSTEM_ADMIN', 'BRANCH_MANAGER', 'PROPERTY_SPECIALIST', 'RECEPTIONIST'];
  const screens = $derived(NAV_FOR_ROLE[session.user?.role ?? ''] ?? []);
  const nav = $derived(screens.map((s) => ({ ...SCREENS[s], exact: s === 'overview' })));

  // A role landing on a screen it doesn't have goes to its overview instead.
  $effect(() => {
    const path = page.url.pathname;
    const screen = (Object.keys(SCREENS) as StaffScreen[]).find((k) => SCREENS[k].href === path);
    if (session.user && screen && !screens.includes(screen)) goto('/staff', { replaceState: true });
  });
</script>

<RoleGate roles={STAFF_ROLES} loginRole="staff">
  <PortalShell
    portal="Staff Portal"
    {nav}
    who={session.user?.name ?? ''}
    whoMeta="{session.user?.code ?? ''} · {ROLE_LABEL[session.user?.role ?? '']} · {session.user?.mfaEnabled ? 'MFA on' : 'MFA off'}"
  >
    {#snippet controls()}
      {#if session.user?.role === 'SYSTEM_ADMIN'}
        <label class="scope">
          Branch
          <select bind:value={staffScope.value}>
            <option value="all">All branches</option>
            <option value="Male">Branch 1 · Malé</option>
            <option value="Hulhumale">Branch 2 · Hulhumalé</option>
            <option value="Villingili">Branch 3 · Villingili</option>
          </select>
        </label>
      {:else}
        <div class="scope">
          Branch
          <span class="fixed">{branchLabel(session.user?.branch)}</span>
        </div>
      {/if}
    {/snippet}
    {@render children()}
  </PortalShell>
</RoleGate>

<style>
  .scope {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 11.5px;
    color: var(--on-spine-faint);
  }

  select {
    width: 100%;
    min-height: 38px;
    padding: 8px 10px;
    border: 1px solid rgba(177, 205, 174, 0.3);
    border-radius: 8px;
    background: rgba(247, 246, 242, 0.06);
    color: var(--paper);
    font-size: 13px;
  }

  select:focus-visible {
    outline-color: var(--sage);
  }

  option {
    color: var(--ink);
  }

  .fixed {
    color: var(--paper);
    font-size: 13px;
  }
</style>
