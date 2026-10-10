<script lang="ts">
  import type { Snippet } from 'svelte';
  import { session } from '$lib/session.svelte';
  import PortalShell from '$lib/components/PortalShell.svelte';
  import RoleGate from '$lib/components/RoleGate.svelte';

  let { children }: { children: Snippet } = $props();

  const nav = [
    { href: '/owner', label: 'Dashboard', icon: 'dashboard' as const, exact: true },
    { href: '/owner/properties', label: 'My properties', icon: 'properties' as const },
    { href: '/owner/availability', label: 'Availability', icon: 'availability' as const },
    { href: '/owner/earnings', label: 'Earnings', icon: 'earnings' as const },
    { href: '/owner/profile', label: 'Profile', icon: 'profile' as const }
  ];
</script>

<RoleGate roles={['OWNER']} loginRole="owner">
  <PortalShell portal="Owner Portal" {nav} who={session.user?.name ?? ''} whoMeta="Owner · {session.user?.code ?? ''}">
    {@render children()}
  </PortalShell>
</RoleGate>
