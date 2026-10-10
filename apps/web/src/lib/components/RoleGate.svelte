<script lang="ts">
  import type { Snippet } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { session } from '$lib/session.svelte';

  let { roles, loginRole, children }: { roles: string[]; loginRole: string; children: Snippet } = $props();

  const allowed = $derived(!!session.user && roles.includes(session.user.role));

  $effect(() => {
    if (session.ready && !allowed) {
      const next = encodeURIComponent(page.url.pathname + page.url.search);
      goto(`/login?role=${loginRole}&next=${next}`, { replaceState: true });
    }
  });
</script>

{#if allowed}
  {@render children()}
{/if}
