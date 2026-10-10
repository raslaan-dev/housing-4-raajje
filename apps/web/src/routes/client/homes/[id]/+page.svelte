<script lang="ts">
  import type { ClientMe, Listing } from '@housing/shared';
  import { page } from '$app/state';
  import { api } from '$lib/api';
  import { action, resource } from '$lib/resource.svelte';
  import { branchLabel, date, mvr, termLabel } from '$lib/format';
  import ListingDetail from '$lib/components/ListingDetail.svelte';
  import LoadState from '$lib/components/LoadState.svelte';

  const id = page.params.id;
  const listing = resource(() => api.get<Listing>(`/properties/${id}`));
  const me = resource(() => api.get<ClientMe>('/client/me'));

  const TERMS = [1, 6, 12, 24, 60];
  let term = $state(12);

  const start = (() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 1);
  })();
  const end = $derived(new Date(start.getFullYear(), start.getMonth() + term, 0));

  const applied = $derived(me.data?.applications.find((a) => a.propertyId === id && a.status !== 'WITHDRAWN'));
  const viewing = $derived(me.data?.viewings.find((v) => v.propertyId === id && v.status === 'SCHEDULED'));

  const applyAct = action();
  const viewAct = action();

  async function apply() {
    await applyAct.run(async () => {
      await api.post('/client/applications', { propertyId: id, termMonths: term });
      await me.reload();
    });
  }

  async function requestViewing() {
    await viewAct.run(async () => {
      await api.post('/client/viewings', { propertyId: id });
      await me.reload();
    });
  }
</script>

<svelte:head><title>{listing.data?.title ?? 'Apartment'} · Client Portal</title></svelte:head>

<LoadState loading={listing.loading} error={listing.error} retry={listing.reload} rows={6}>
  {#if listing.data}
    {@const l = listing.data}
    <ListingDetail listing={l} backHref="/client" backLabel="All apartments">
      {#snippet panel()}
        <fieldset class="terms">
          <legend>Lease term</legend>
          <div class="chips">
            {#each TERMS as m}
              <button type="button" class="chip" aria-pressed={term === m} onclick={() => (term = m)}>{termLabel(m)}</button>
            {/each}
          </div>
        </fieldset>

        <dl class="kv sums">
          <div><dt>Start</dt><dd>{date(start.toISOString())}</dd></div>
          <div><dt>Ends</dt><dd>{date(end.toISOString())}</dd></div>
          <div><dt>Advance + deposit</dt><dd class="num">{mvr(l.monthlyRent * 2)}</dd></div>
          <div class="total"><dt>Total over term</dt><dd class="num">{mvr(l.monthlyRent * term)}</dd></div>
        </dl>

        {#if applied}
          <p class="notice applied" role="status">
            Application sent to {branchLabel(l.branch)} on {date(applied.createdAt)}. A property specialist will verify it and
            message you.
          </p>
        {:else}
          <button type="button" class="btn btn-primary btn-block act" onclick={apply} disabled={applyAct.busy || me.loading}>
            {applyAct.busy ? 'Sending…' : 'Apply for this apartment'}
          </button>
          {#if applyAct.error}<p class="form-error" role="alert">{applyAct.error}</p>{/if}
        {/if}

        <button
          type="button"
          class="btn btn-block second"
          onclick={requestViewing}
          disabled={!!viewing || viewAct.busy || me.loading}
        >
          {viewing ? 'Viewing requested · staff will confirm' : viewAct.busy ? 'Requesting…' : 'Request a viewing'}
        </button>
        {#if viewAct.error}<p class="form-error" role="alert">{viewAct.error}</p>{/if}
      {/snippet}
    </ListingDetail>
  {/if}
</LoadState>

<style>
  .terms {
    margin: 26px 0 0;
    padding: 0;
    border: none;
  }

  .terms legend {
    margin-bottom: 10px;
    padding: 0;
    font-size: 13px;
    font-weight: 600;
  }

  .sums {
    margin: 22px 0 0;
  }


  .act,
  .applied {
    margin-top: 22px;
  }

  .second {
    margin-top: 10px;
  }

  .form-error {
    margin-top: 8px;
  }
</style>
