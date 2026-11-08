<script lang="ts">
  import { PHOTO_LIBRARY, type BranchName } from '@housing/shared';

  const ISLANDS: { key: BranchName; label: string }[] = [
    { key: 'Male', label: 'Malé' },
    { key: 'Hulhumale', label: 'Hulhumalé' },
    { key: 'Villingili', label: 'Villingili' }
  ];
</script>

<svelte:head><title>Photo credits · Housing_4_Raajje</title></svelte:head>

<section class="wrap">
  <h1 class="page-title">Photo credits</h1>
  <p class="page-lede">
    Apartment interior photos are sample images supplied by the Housing_4_Raajje team for demonstration. The
    neighbourhood photos below are representative pictures of each island from Wikimedia Commons, not the exact
    buildings, and are used under the licences shown.
  </p>

  {#each ISLANDS as island (island.key)}
    <h2 class="section-title">{island.label}</h2>
    <ul class="credits">
      {#each PHOTO_LIBRARY[island.key] as photo (photo.url)}
        <li>
          <img src={photo.url} alt={photo.caption} loading="lazy" />
          <div>
            <a href={photo.sourceUrl} target="_blank" rel="noreferrer">{photo.caption}</a>
            <span class="meta">{photo.author} · {photo.license}</span>
          </div>
        </li>
      {/each}
    </ul>
  {/each}
</section>

<style>
  .wrap {
    max-width: 900px;
    padding: 32px 56px 72px;
  }

  .section-title {
    margin-top: 32px;
  }

  .credits {
    display: grid;
    gap: 12px;
    margin: 14px 0 0;
    padding: 0;
    list-style: none;
  }

  .credits li {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .credits img {
    width: 96px;
    height: 64px;
    flex: none;
    object-fit: cover;
    border-radius: 6px;
    background: var(--mist);
  }

  .credits a {
    font-weight: 600;
  }

  .meta {
    display: block;
    font-size: 13px;
    color: var(--muted);
  }

  @media (max-width: 760px) {
    .wrap {
      padding: 24px 16px 56px;
    }
  }
</style>
