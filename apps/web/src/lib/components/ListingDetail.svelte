<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Listing } from '@housing/shared';
  import { branchLabel, fullAddress, mvr } from '$lib/format';
  import Icon from './Icon.svelte';

  let { listing, backHref, backLabel, panel }: { listing: Listing; backHref: string; backLabel: string; panel: Snippet } =
    $props();
</script>

<a class="back-link" href={backHref}><Icon name="arrow-left" size={14} /> {backLabel}</a>

<div class="detail">
  <div>
    <figure class="hero-photo">
      <img src={listing.images[0].url} alt={listing.images[0].caption} />
      <figcaption>
        Representative demo imagery ·
        <a href={listing.images[0].sourceUrl} target="_blank" rel="noreferrer">{listing.images[0].credit}</a>
      </figcaption>
    </figure>
    <h1 class="title">{listing.title}</h1>
    <p class="address">{fullAddress(listing)}</p>
    <p class="description">{listing.description}</p>
    <dl class="facts">
      <div><dt>Type</dt><dd>{listing.propertyType}</dd></div>
      <div><dt>Rooms</dt><dd class="num">{listing.roomCount}</dd></div>
      <div><dt>Handled by</dt><dd>{branchLabel(listing.branch)}</dd></div>
    </dl>
  </div>

  <aside class="sheet panel">
    <div class="rent num">{mvr(listing.monthlyRent)}<span> / month</span></div>
    {@render panel()}
  </aside>
</div>

<style>
  .detail {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(300px, 1fr);
    gap: 40px;
    margin-top: 22px;
    align-items: start;
  }

  .hero-photo {
    position: relative;
    height: 360px;
    margin: 0;
    overflow: hidden;
    border-radius: var(--radius-sheet);
    background: var(--mist);
  }

  .hero-photo img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .hero-photo figcaption {
    position: absolute;
    right: 12px;
    bottom: 12px;
    padding: 5px 9px;
    border-radius: 6px;
    background: rgba(15, 42, 50, 0.78);
    color: #fff;
    font-size: 11px;
  }

  .hero-photo figcaption a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .title {
    margin-top: 26px;
    font-size: 30px;
    letter-spacing: -0.02em;
  }

  .address {
    margin-top: 8px;
    font-size: 14px;
    color: var(--muted);
  }

  .description {
    margin-top: 18px;
    max-width: 68ch;
    font-size: 14px;
    line-height: 1.7;
    color: var(--ink-soft);
  }

  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: 20px 40px;
    margin: 26px 0 0;
    padding-top: 22px;
    border-top: 1px solid var(--line);
  }

  .facts dt {
    font-size: 12px;
    color: var(--muted);
  }

  .facts dd {
    margin: 4px 0 0;
    font-size: 15px;
    font-weight: 600;
  }

  .panel {
    position: sticky;
    top: 92px;
    padding: 28px 30px;
  }

  .rent {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  .rent span {
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 400;
    color: var(--muted);
    letter-spacing: 0;
  }

  @media (max-width: 860px) {
    .detail {
      grid-template-columns: 1fr;
    }

    .hero-photo {
      height: 220px;
    }

    .panel {
      position: static;
      padding: 24px 22px;
    }
  }
</style>
