<script lang="ts">
  import ListingSearch from '$lib/components/ListingSearch.svelte';

  let q = $state('');
  let reset = $state(0);
</script>

<svelte:head>
  <title>Verified apartments in Malé, Hulhumalé and Villingili · Housing_4_Raajje</title>
</svelte:head>

<section class="band">
  <h1>Find a verified apartment in Malé, Hulhumalé or Villingili</h1>
  <form class="search" role="search" onsubmit={(e) => e.preventDefault()}>
    <label class="visually-hidden" for="q">Search apartments</label>
    <input id="q" class="search-input" type="search" bind:value={q} placeholder="Search by name, street or island" autocomplete="off" />
    <button
      type="button"
      class="clear"
      onclick={() => {
        q = '';
        reset++;
      }}>Clear filters</button
    >
  </form>
</section>

<section class="results">
  <ListingSearch variant="public" {q} resetSignal={reset} hrefFor={(l) => `/homes/${l.id}`} />
</section>

<style>
  .band {
    padding: 56px 56px 64px;
    background: var(--ink);
    color: var(--paper);
  }

  h1 {
    max-width: 18ch;
    font-size: clamp(32px, 4.2vw, 44px);
    letter-spacing: -0.025em;
    line-height: 1.1;
  }


  .search {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    max-width: 760px;
    margin-top: 32px;
  }

  .search-input {
    flex: 1;
    min-width: min(100%, 260px);
    padding: 15px 16px;
    border: 2px solid transparent;
    border-radius: 10px;
    background: var(--sheet);
    color: var(--ink);
    font-size: 15px;
  }

  .search-input::placeholder {
    color: rgba(21, 65, 83, 0.55);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--sage);
  }

  .clear {
    flex: none;
    padding: 14px 20px;
    border-radius: 10px;
    border: 1px solid rgba(177, 205, 174, 0.45);
    background: transparent;
    color: var(--sage);
    font-size: 13.5px;
    font-weight: 600;
  }

  .clear:hover {
    border-color: var(--sage);
    color: #fff;
  }

  .clear:focus-visible {
    outline-color: var(--sage);
  }

  .results {
    padding: 28px 56px 72px;
  }

  @media (max-width: 760px) {
    .band {
      padding: 36px 16px 40px;
    }

    .results {
      padding: 24px 16px 56px;
    }

    .clear {
      width: 100%;
    }
  }
</style>
