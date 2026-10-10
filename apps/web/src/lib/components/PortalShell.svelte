<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { signOut } from '$lib/session.svelte';
  import Icon, { type IconName } from './Icon.svelte';

  type NavItem = { href: string; label: string; icon: IconName; exact?: boolean; also?: string[] };

  let {
    portal,
    nav,
    who,
    whoMeta,
    controls,
    children
  }: {
    portal: string;
    nav: NavItem[];
    who: string;
    whoMeta: string;
    controls?: Snippet;
    children: Snippet;
  } = $props();

  let menuOpen = $state(false);
  let hovered = $state<string | null>(null);

  const isActive = (item: NavItem) => {
    const path = page.url.pathname;
    if (item.exact) return path === item.href || (item.also ?? []).some((p) => path.startsWith(p));
    return path === item.href || path.startsWith(item.href + '/');
  };

  $effect(() => {
    page.url.pathname;
    menuOpen = false;
  });

  function leave() {
    signOut();
    goto('/login');
  }
</script>

<div class="portal">
  <aside class="spine" aria-label="{portal} navigation">
    <div class="spine-head">
      <a class="wordmark" href="/">Housing_4_Raajje</a>
      <div class="portal-name">{portal}</div>
      <button
        type="button"
        class="menu-toggle"
        aria-expanded={menuOpen}
        aria-controls="portal-nav"
        onclick={() => (menuOpen = !menuOpen)}
      >
        <Icon name={menuOpen ? 'menu-close' : 'menu-open'} size={18} animate={menuOpen} />
        <span class="visually-hidden">Menu</span>
      </button>
    </div>

    <div class="spine-body" id="portal-nav" data-open={menuOpen}>
      {#if controls}
        <div class="controls">{@render controls()}</div>
      {/if}

      <nav>
        {#each nav as item (item.href)}
          <a
            href={item.href}
            class="nav-item"
            aria-current={isActive(item) ? 'page' : undefined}
            onmouseenter={() => (hovered = item.href)}
            onmouseleave={() => (hovered = null)}
            onfocus={() => (hovered = item.href)}
            onblur={() => (hovered = null)}
          >
            <Icon name={item.icon} size={17} animate={hovered === item.href} />
            <span>{item.label}</span>
          </a>
        {/each}
      </nav>

      <div class="identity">
        <div class="who">{who}</div>
        <div class="who-meta">{whoMeta}</div>
        <button type="button" class="sign-out" onclick={leave}>Sign out</button>
      </div>
    </div>
  </aside>

  <main class="main">
    {@render children()}
  </main>
</div>

<style>
  .portal {
    display: flex;
    min-height: 100vh;
  }

  .spine {
    position: sticky;
    top: 0;
    flex: none;
    width: 248px;
    height: 100vh;
    padding: 30px 20px 26px;
    display: flex;
    flex-direction: column;
    gap: 30px;
    background: var(--ink);
    color: var(--on-spine);
    overflow-y: auto;
  }

  .spine-head {
    position: relative;
    padding: 0 10px;
  }

  .wordmark {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 600;
    color: #fff;
  }

  .wordmark:hover {
    color: var(--sage);
  }

  .portal-name {
    margin-top: 3px;
    font-size: 11.5px;
    color: var(--on-spine-faint);
  }

  .menu-toggle {
    display: none;
  }

  .spine-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 30px;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 0 4px;
  }

  nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 13.5px;
    color: var(--on-spine-soft);
    transition:
      background-color 0.15s ease,
      color 0.15s ease;
  }

  .nav-item:hover {
    background: rgba(177, 205, 174, 0.1);
    color: #fff;
  }

  .nav-item[aria-current='page'] {
    background: var(--sage);
    color: var(--ink);
    font-weight: 600;
  }

  .nav-item:focus-visible,
  .sign-out:focus-visible,
  .wordmark:focus-visible,
  .menu-toggle:focus-visible {
    outline-color: var(--sage);
  }

  .identity {
    margin-top: auto;
    padding: 0 12px;
    font-size: 12px;
    line-height: 1.5;
  }

  .who {
    color: var(--on-spine);
  }

  .who-meta {
    color: var(--on-spine-faint);
  }

  .sign-out {
    margin-top: 10px;
    padding: 0;
    border: none;
    background: none;
    color: var(--sage);
    font-size: 12px;
    text-decoration: underline;
    text-decoration-color: rgba(177, 205, 174, 0.4);
    text-underline-offset: 3px;
  }

  .sign-out:hover {
    color: #fff;
  }

  .main {
    flex: 1;
    min-width: 0;
    max-width: 1180px;
    padding: 44px 56px 72px;
  }

  @media (max-width: 960px) {
    .portal {
      flex-direction: column;
    }

    .spine {
      position: sticky;
      z-index: 20;
      width: 100%;
      height: auto;
      max-height: 100vh;
      padding: 14px 16px;
      gap: 0;
    }

    .spine-head {
      display: flex;
      gap: 10px;
      padding: 0;
      min-height: 32px;
      align-items: center;
    }

    .portal-name {
      margin-top: 0;
    }

    .menu-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      margin-left: auto;
      border: 1px solid rgba(177, 205, 174, 0.3);
      border-radius: 8px;
      background: transparent;
      color: var(--sage);
    }

    .spine-body {
      display: none;
      padding: 18px 0 8px;
      gap: 22px;
    }

    .spine-body[data-open='true'] {
      display: flex;
    }

    .identity {
      padding-top: 16px;
      border-top: 1px solid rgba(177, 205, 174, 0.15);
    }

    .main {
      padding: 28px 16px 56px;
    }
  }
</style>
