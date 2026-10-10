<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';
  import { session, PORTAL_FOR_ROLE } from '$lib/session.svelte';

  let { children }: { children: Snippet } = $props();

  const portalHref = $derived(session.user ? PORTAL_FOR_ROLE[session.user.role] : null);
</script>

<div class="public">
  <header class="bar">
    <a class="wordmark" href="/">Housing_4_Raajje</a>
    <nav aria-label="Main">
      <a class="tab" href="/" aria-current={page.url.pathname === '/' || page.url.pathname.startsWith('/homes') ? 'page' : undefined}>Browse apartments</a>
      <a class="tab" href="/login?role=owner&intent=list">List your property</a>
    </nav>
    {#if portalHref}
      <a class="account" href={portalHref}>My portal</a>
    {:else}
      <a class="account" href="/login">Sign in</a>
    {/if}
  </header>

  <main>
    {@render children()}
  </main>

  <footer class="foot">
    <div>Branch 1 Malé · Branch 2 Hulhumalé · Branch 3 Villingili</div>
    <div class="foot-links">
      <a href="/login?role=staff">Staff sign in</a>
    </div>
  </footer>
</div>

<style>
  .public {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .bar {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 16px 24px;
    flex-wrap: wrap;
    padding: 16px 56px;
    background: var(--ink);
  }

  .wordmark {
    font-family: var(--font-display);
    font-size: 17px;
    font-weight: 600;
    color: #fff;
  }

  .wordmark:hover {
    color: var(--sage);
  }

  nav {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
    margin-left: auto;
  }

  .tab {
    padding: 9px 14px;
    border-radius: 8px;
    font-size: 13.5px;
    color: var(--on-spine-soft);
    white-space: nowrap;
  }

  .tab:hover {
    color: #fff;
    background: rgba(177, 205, 174, 0.1);
  }

  .tab[aria-current='page'] {
    background: var(--sage);
    color: var(--ink);
    font-weight: 600;
  }

  .account {
    margin-left: 10px;
    padding: 8px 16px;
    border: 1px solid rgba(177, 205, 174, 0.45);
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--sage);
    white-space: nowrap;
  }

  .account:hover {
    border-color: var(--sage);
    color: #fff;
  }

  .bar a:focus-visible {
    outline-color: var(--sage);
  }

  main {
    flex: 1;
  }

  .foot {
    display: flex;
    justify-content: space-between;
    gap: 12px 24px;
    flex-wrap: wrap;
    padding: 26px 56px;
    border-top: 1px solid var(--line);
    font-size: 12.5px;
    color: var(--muted);
  }

  .foot-links a {
    color: var(--muted);
  }

  .foot-links a:hover {
    color: var(--ink);
  }

  @media (max-width: 760px) {
    .bar {
      padding: 12px 16px;
    }

    .bar {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 12px;
    }

    nav {
      grid-column: 1 / -1;
      grid-row: 2;
      margin: 0 -4px;
      padding-inline: 4px;
      overflow-x: auto;
      flex-wrap: nowrap;
    }

    .account {
      margin-left: 0;
    }

    .foot {
      padding: 22px 16px;
    }
  }
</style>
