<script lang="ts">
  import type { Listing, ListingQuery } from '@housing/shared';
  import { untrack } from 'svelte';
  import { api, errorMessage } from '$lib/api';
  import { mvr, rooms, streetLine, CITIES } from '$lib/format';
  import LoadState from './LoadState.svelte';

  let {
    q = '',
    variant,
    hrefFor,
    heading,
    initialMaxRent = 30000,
    resetSignal = 0
  }: {
    q?: string;
    variant: 'public' | 'client';
    hrefFor: (l: Listing) => string;
    heading?: string;
    initialMaxRent?: number;
    resetSignal?: number;
  } = $props();

  let city = $state<string>('All');
  let roomFilter = $state<string>('Any');
  let type = $state<string>('Any');
  let maxRent = $state(untrack(() => initialMaxRent));
  let sort = $state<'new' | 'low' | 'high'>('new');

  let listings = $state<Listing[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let seq = 0;
  let attempt = $state(0);

  $effect(() => {
    if (resetSignal) {
      city = 'All';
      roomFilter = 'Any';
      type = 'Any';
      maxRent = 30000;
    }
  });

  async function load(query: ListingQuery) {
    const mine = ++seq;
    loading = true;
    error = null;
    try {
      const result = await api.get<Listing[]>('/properties', query as Record<string, string | number | undefined>);
      if (mine === seq) listings = result;
    } catch (e) {
      if (mine === seq) error = errorMessage(e);
    } finally {
      if (mine === seq) loading = false;
    }
  }

  $effect(() => {
    const query: ListingQuery = {
      city: city === 'All' ? undefined : city,
      rooms: roomFilter === 'Any' ? undefined : roomFilter,
      type: type === 'Any' ? undefined : (type as ListingQuery['type']),
      maxRent,
      q: q.trim() || undefined,
      sort
    };
    attempt;
    const timer = setTimeout(() => load(query), q ? 220 : 0);
    return () => clearTimeout(timer);
  });

  const countLabel = $derived(`${listings.length} ${listings.length === 1 ? 'apartment' : 'apartments'}${variant === 'public' ? ' available' : ''}`);
</script>

<div class="filters" class:is-sheet={variant === 'client'}>
  <fieldset>
    <legend>Location</legend>
    <div class="chips">
      {#each ['All', ...CITIES] as v}
        <button type="button" class="chip" aria-pressed={city === v} onclick={() => (city = v)}>{v}</button>
      {/each}
    </div>
  </fieldset>
  <fieldset>
    <legend>Rooms</legend>
    <div class="chips">
      {#each ['Any', '1', '2', '3', '4+'] as v}
        <button type="button" class="chip" aria-pressed={roomFilter === v} onclick={() => (roomFilter = v)}>{v}</button>
      {/each}
    </div>
  </fieldset>
  {#if variant === 'public'}
    <fieldset>
      <legend>Type</legend>
      <div class="chips">
        {#each ['Any', 'Apartment', 'Flat'] as v}
          <button type="button" class="chip" aria-pressed={type === v} onclick={() => (type = v)}>{v}</button>
        {/each}
      </div>
    </fieldset>
  {/if}
  <label class="budget">
    <span class="legend-row"><span>Max monthly rent</span><strong class="num">{mvr(maxRent)}</strong></span>
    <input type="range" min="5000" max="30000" step="500" bind:value={maxRent} aria-valuetext={mvr(maxRent)} />
  </label>
</div>

<div class="results-head">
  {#if heading}
    <h2 class="section-title">{heading}</h2>
  {/if}
  <div class="results-meta">
    <span class="count" aria-live="polite">{loading ? 'Searching…' : countLabel}</span>
    {#if variant === 'public'}<label class="sort">
      Sort
      <select class="input on-paper" bind:value={sort}>
        <option value="new">Newest</option>
        <option value="low">Rent: low to high</option>
        <option value="high">Rent: high to low</option>
      </select>
    </label>{/if}
  </div>
</div>

<LoadState loading={loading && listings.length === 0} {error} retry={() => attempt++}>
  {#if listings.length === 0}
    <p class="empty">No apartments match. Try a higher budget or another location.</p>
  {:else}
    <ul class="grid" class:is-refreshing={loading}>
      {#each listings as l (l.id)}
        <li>
          <a class="card" href={hrefFor(l)}>
            <div class="well card-well" aria-hidden="true"></div>
            <div class="card-body">
              <div class="card-top">
                <span class="card-name">{l.title}</span>
                <span class="card-city">{l.city}</span>
              </div>
              <div class="card-address">{streetLine(l)}</div>
              <div class="card-foot">
                <span>{l.propertyType} · {rooms(l.roomCount)}</span>
                <span class="card-rent num">{mvr(l.monthlyRent)}</span>
              </div>
            </div>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</LoadState>

<style>
  .filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
    gap: 24px 28px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--line);
  }

  .filters.is-sheet {
    padding: 22px 24px;
    background: var(--sheet);
    border: 1px solid var(--line);
    border-radius: var(--radius-sheet);
  }

  fieldset {
    margin: 0;
    padding: 0;
    border: none;
    min-width: 0;
  }

  legend,
  .legend-row {
    margin-bottom: 9px;
    padding: 0;
    font-size: 12px;
    color: var(--muted);
  }

  .budget {
    display: block;
  }

  .legend-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }

  .legend-row strong {
    color: var(--ink);
    font-weight: 600;
  }

  .results-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 28px;
    margin-bottom: 20px;
  }

  .results-meta {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
    margin-left: auto;
  }

  .results-head:not(:has(h2)) .results-meta {
    margin-left: 0;
    width: 100%;
    justify-content: space-between;
  }

  .count {
    font-size: 13px;
    color: var(--muted);
  }

  .sort {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    color: var(--muted);
  }

  .sort .input {
    width: auto;
    min-height: 36px;
    padding-block: 6px;
    font-size: 13px;
  }

  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 270px), 1fr));
    gap: 24px;
    transition: opacity 0.2s ease;
  }

  .grid.is-refreshing {
    opacity: 0.55;
  }

  .card {
    display: block;
    height: 100%;
    background: var(--sheet);
    border: 1px solid var(--line);
    border-radius: var(--radius-sheet);
    overflow: hidden;
    transition: border-color 0.2s ease;
  }

  .card:hover {
    border-color: var(--moss);
    color: var(--ink);
  }

  .card-well {
    height: 168px;
    transition: background-position 1.2s var(--ease-out);
  }

  .card:hover .card-well {
    background-position: 60px 0;
  }

  .card-body {
    padding: 18px 20px 20px;
  }

  .card-top,
  .card-foot {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
  }

  .card-name {
    font-size: 15px;
    font-weight: 600;
  }

  .card-city {
    flex: none;
    font-size: 11.5px;
    color: var(--muted);
  }

  .card-address {
    margin-top: 5px;
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--muted);
  }

  .card-foot {
    margin-top: 16px;
    font-size: 12.5px;
    color: var(--ink-soft);
  }

  .card-rent {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 600;
    color: var(--ink);
  }
</style>
