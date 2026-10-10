<script lang="ts">
  import type { MatchResult } from '@housing/shared';
  import { api } from '$lib/api';
  import { action } from '$lib/resource.svelte';
  import { scoped } from '$lib/staff.svelte';
  import { mvr } from '$lib/format';
  import LoadState from '$lib/components/LoadState.svelte';

  let propertyId = $state<string | undefined>(undefined);
  const result = scoped((branch) => api.get<MatchResult>('/staff/matches', { branch, propertyId }));
  const notify = action();
  let notifying = $state<string | null>(null);

  const listing = $derived(result.data?.listings.find((l) => l.id === result.data?.selected));

  function pick(id: string) {
    propertyId = id;
    result.reload();
  }

  async function notifyClient(clientId: string) {
    if (!result.data?.selected) return;
    notifying = clientId;
    const updated = await notify.run(() => api.post<MatchResult>('/staff/matches/notify', { propertyId: result.data?.selected, clientId }));
    if (updated) result.set(updated);
    notifying = null;
  }
</script>

<svelte:head><title>Matchmaker · Staff Portal</title></svelte:head>

<h1 class="page-title">Lease matchmaker</h1>
<p class="page-lede">New listings matched to client profiles by maximum rent, location and rooms.</p>

<LoadState loading={result.loading && !result.data} error={result.error} retry={result.reload} rows={6}>
  {#if !result.data?.listings.length}
    <p class="empty">No available listings in this branch to match.</p>
  {:else}
    <div class="chips tabs" role="group" aria-label="Listing">
      {#each result.data.listings as l (l.id)}
        <button type="button" class="chip" aria-pressed={l.id === result.data.selected} onclick={() => pick(l.id)}>{l.title}</button>
      {/each}
    </div>

    {#if listing}
      <dl class="sheet facts">
        <div><dt>Listing</dt><dd>{listing.title}</dd></div>
        <div><dt>Location</dt><dd>{listing.city}</dd></div>
        <div><dt>Rooms</dt><dd>{listing.roomCount}</dd></div>
        <div><dt>Rent</dt><dd class="num">{mvr(listing.monthlyRent)}</dd></div>
      </dl>
    {/if}

    <div class="list" class:is-refreshing={result.loading}>
      {#if notify.error}<p class="form-error" role="alert">{notify.error}</p>{/if}
      {#if result.data.matches.length === 0}
        <p class="empty">No client profiles match at least two of location, budget and rooms.</p>
      {:else}
        <div class="scroll-x">
          <table class="ledger wide">
            <thead><tr><th>Client</th><th>Preference</th><th>Match</th><th class="end">Action</th></tr></thead>
            <tbody>
              {#each result.data.matches as m (m.clientId)}
                <tr>
                  <td class="strong">{m.code}</td>
                  <td class="meta">
                    {m.preferredLocation ?? 'Any location'} · {m.roomCount ?? 'any'} rooms · max {mvr(m.maxRent)}
                  </td>
                  <td>
                    <span class="pill {m.score === 3 ? 'pill-sage' : 'pill-ink'}">{m.score === 3 ? 'Full match' : 'Partial'}</span>
                    <span class="why" title={m.explanation}>{m.reasons.join(', ')} match</span>
                  </td>
                  <td class="end">
                    {#if m.notified}
                      <span class="done">Notified</span>
                    {:else}
                      <button type="button" class="btn btn-sm" onclick={() => notifyClient(m.clientId)} disabled={notify.busy}>
                        {notifying === m.clientId ? 'Sending…' : 'Notify client'}
                      </button>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}
</LoadState>

<style>
  .tabs {
    margin-top: 26px;
  }

  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: 16px 40px;
    margin: 24px 0 0;
    padding: 20px 24px;
    font-size: 13.5px;
  }

  .facts dt {
    font-size: 12px;
    color: var(--muted);
  }

  .facts dd {
    margin: 4px 0 0;
    font-weight: 600;
  }

  .list {
    margin-top: 26px;
    transition: opacity 0.2s ease;
  }

  .list.is-refreshing {
    opacity: 0.55;
  }

  .wide {
    min-width: 680px;
  }

  .why {
    margin-left: 8px;
    font-size: 12.5px;
    color: var(--muted);
  }

  .done {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--moss-deep);
  }
</style>
