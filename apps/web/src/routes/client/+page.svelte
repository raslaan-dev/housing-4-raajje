<script lang="ts">
  import type { ClientMe } from '@housing/shared';
  import { api } from '$lib/api';
  import { resource } from '$lib/resource.svelte';
  import ListingSearch from '$lib/components/ListingSearch.svelte';

  const me = resource(() => api.get<ClientMe>('/client/me'));
  const startBudget = $derived(Math.min(30000, Math.max(5000, me.data?.profile.maxRent ?? 20000)));
</script>

<svelte:head><title>Find a home · Client Portal</title></svelte:head>

<h1 class="page-title">Find a home</h1>
<p class="page-lede">Verified apartments in Malé, Hulhumalé and Villingili.</p>

<div class="search">
  {#if !me.loading}
    <ListingSearch variant="client" heading="Available now" initialMaxRent={startBudget} hrefFor={(l) => `/client/homes/${l.id}`} />
  {/if}
</div>

<style>
  .search {
    margin-top: 32px;
  }
</style>
