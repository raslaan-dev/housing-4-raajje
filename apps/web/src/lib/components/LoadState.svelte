<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    loading,
    error,
    retry,
    rows = 4,
    children
  }: { loading: boolean; error: string | null; retry?: () => void; rows?: number; children: Snippet } = $props();
</script>

{#if error}
  <div class="notice is-error notice-row" role="alert">
    <span>{error}</span>
    {#if retry}<button type="button" class="link" onclick={retry}>Try again</button>{/if}
  </div>
{:else if loading}
  <div class="loading" aria-busy="true" aria-label="Loading">
    <span class="skeleton" style="height: 28px; width: 40%"></span>
    {#each Array(rows) as _, i}
      <span class="skeleton" style="height: 18px; width: {92 - i * 9}%"></span>
    {/each}
  </div>
{:else}
  {@render children()}
{/if}

<style>
  .loading {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 8px 0 24px;
  }
</style>
