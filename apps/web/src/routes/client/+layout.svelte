<script lang="ts">
  import type { Snippet } from 'svelte';
  import { session } from '$lib/session.svelte';
  import PortalShell from '$lib/components/PortalShell.svelte';
  import RoleGate from '$lib/components/RoleGate.svelte';

  let { children }: { children: Snippet } = $props();

  const nav = [
    { href: '/client', label: 'Find a home', icon: 'search' as const, exact: true, also: ['/client/homes'] },
    { href: '/client/lease', label: 'My lease', icon: 'lease' as const },
    { href: '/client/messages', label: 'Messages', icon: 'messages' as const },
    { href: '/client/maintenance', label: 'Maintenance', icon: 'maintenance' as const },
    { href: '/client/profile', label: 'Profile', icon: 'profile' as const }
  ];
</script>

<RoleGate roles={['CLIENT']} loginRole="client">
  <PortalShell portal="Client Portal" {nav} who={session.user?.name ?? ''} whoMeta="Client · {session.user?.code ?? ''}">
    {@render children()}
  </PortalShell>
</RoleGate>
