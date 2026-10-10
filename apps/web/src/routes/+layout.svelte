<script lang="ts">
  import '../app.css';
  import type { Snippet } from 'svelte';
  import { loadSession } from '$lib/session.svelte';

  let { children }: { children: Snippet } = $props();

  loadSession();
</script>

<svelte:head>
  <title>Housing_4_Raajje</title>
</svelte:head>

{@render children()}
