<script lang="ts">
  import type { Listing } from '@housing/shared';
  import { page } from '$app/state';
  import { api } from '$lib/api';
  import { resource } from '$lib/resource.svelte';
  import { branchLabel } from '$lib/format';
  import { session } from '$lib/session.svelte';
  import ListingDetail from '$lib/components/ListingDetail.svelte';
  import LoadState from '$lib/components/LoadState.svelte';

  const listing = resource(() => api.get<Listing>(`/properties/${page.params.id}`));
  const isClient = $derived(session.user?.role === 'CLIENT');
</script>

<svelte:head>
  <title>{listing.data ? `${listing.data.title} · ` : ''}Housing_4_Raajje</title>
</svelte:head>

<section class="wrap">
  <LoadState loading={listing.loading} error={listing.error} retry={listing.reload} rows={6}>
    {#if listing.data}
      {@const l = listing.data}
      <ListingDetail listing={l} backHref="/" backLabel="Back to results">
        {#snippet panel()}
          <p class="note">
            Viewings are escorted by staff from {branchLabel(l.branch)}.
            {#if !isClient}Sign in or create a free client account to request a viewing or apply.{/if}
          </p>
          {#if isClient}
            <a class="btn btn-primary btn-block cta" href="/client/homes/{l.id}">Apply or request a viewing</a>
          {:else}
            <a class="btn btn-primary btn-block cta" href="/login?role=client&next=/client/homes/{l.id}">Request a viewing</a>
            <a class="btn btn-block" href="/login?role=client&next=/client/homes/{l.id}">Apply for this apartment</a>
          {/if}
        {/snippet}
      </ListingDetail>
    {/if}
  </LoadState>
</section>

<style>
  .wrap {
    padding: 32px 56px 72px;
  }

  .note {
    margin-top: 14px;
    font-size: 13.5px;
    line-height: 1.6;
    color: var(--muted);
  }

  .cta {
    margin-top: 22px;
  }

  .cta + .btn {
    margin-top: 10px;
  }

  @media (max-width: 760px) {
    .wrap {
      padding: 24px 16px 56px;
    }
  }
</style>
