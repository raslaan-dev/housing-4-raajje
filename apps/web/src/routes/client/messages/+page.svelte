<script lang="ts">
  import type { MessageThread } from '@housing/shared';
  import { tick } from 'svelte';
  import { api } from '$lib/api';
  import { action, resource } from '$lib/resource.svelte';
  import { relativeStamp } from '$lib/format';
  import LoadState from '$lib/components/LoadState.svelte';

  const threads = resource(() => api.get<MessageThread[]>('/client/messages'));
  let selected = $state<string | null>(null);
  let draft = $state('');
  let scroller = $state<HTMLDivElement>();
  let mobileShowThread = $state(false);

  const current = $derived(threads.data?.find((t) => t.key === selected) ?? threads.data?.[0]);
  const send = action();

  $effect(() => {
    current?.messages.length;
    tick().then(() => scroller?.scrollTo({ top: scroller.scrollHeight }));
  });

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !current) return;
    const updated = await send.run(() => api.post<MessageThread>('/client/messages', { threadKey: current.key, content }));
    if (updated && threads.data) {
      threads.set(threads.data.map((t) => (t.key === updated.key ? updated : t)));
      draft = '';
    }
  }
</script>

<svelte:head><title>Messages · Client Portal</title></svelte:head>

<h1 class="page-title">Messages</h1>
<p class="page-lede">Conversations with owners are relayed and supervised by branch staff.</p>

<div class="inbox-wrap">
  <LoadState loading={threads.loading} error={threads.error} retry={threads.reload} rows={5}>
    {#if !threads.data?.length}
      <p class="empty">No conversations yet. Staff start a thread when you request a viewing or apply.</p>
    {:else if current}
      <div class="inbox" data-thread={mobileShowThread}>
        <ul class="threads" aria-label="Conversations">
          {#each threads.data as t (t.key)}
            <li>
              <button
                type="button"
                class="thread"
                aria-current={t.key === current.key ? 'true' : undefined}
                onclick={() => {
                  selected = t.key;
                  mobileShowThread = true;
                }}
              >
                <span class="t-title">{t.title}</span>
                <span class="t-sub">via {t.staff.name}</span>
              </button>
            </li>
          {/each}
        </ul>

        <section class="conversation" aria-label={current.title}>
          <header class="c-head">
            <button type="button" class="btn-quiet btn back" onclick={() => (mobileShowThread = false)}>All conversations</button>
            <span class="c-title">{current.title}</span>
            <span class="c-sub">mediated by {current.staff.name}</span>
          </header>
          <div class="log" bind:this={scroller} aria-live="polite">
            {#each current.messages as m (m.id)}
              <div class="msg" class:mine={m.mine}>
                <div class="m-meta">{m.mine ? 'You' : m.senderName} · {relativeStamp(m.createdAt)}</div>
                <div class="bubble">{m.content}</div>
              </div>
            {/each}
          </div>
          <form class="compose" onsubmit={submit}>
            <label class="visually-hidden" for="draft">Message</label>
            <input id="draft" class="input" bind:value={draft} placeholder="Write a message" autocomplete="off" />
            <button type="submit" class="btn btn-primary" disabled={send.busy || !draft.trim()}>Send</button>
          </form>
          {#if send.error}<p class="form-error send-error" role="alert">{send.error}</p>{/if}
        </section>
      </div>
    {/if}
  </LoadState>
</div>

<style>
  .inbox-wrap {
    margin-top: 28px;
  }

  .inbox {
    display: flex;
    height: calc(100vh - 220px);
    min-height: 440px;
    background: var(--sheet);
    border: 1px solid var(--line);
    border-radius: var(--radius-sheet);
    overflow: hidden;
  }

  .threads {
    flex: none;
    width: 300px;
    margin: 0;
    padding: 0;
    list-style: none;
    border-right: 1px solid var(--line-soft);
    overflow-y: auto;
  }

  .thread {
    display: block;
    width: 100%;
    padding: 16px 18px;
    border: none;
    border-bottom: 1px solid var(--line-soft);
    background: transparent;
    text-align: left;
    transition: background-color 0.15s ease;
  }

  .thread:hover {
    background: var(--mist);
  }

  .thread[aria-current='true'] {
    background: var(--sage-wash);
  }

  .t-title {
    display: block;
    font-size: 13.5px;
    font-weight: 600;
  }

  .t-sub {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: var(--muted);
  }

  .conversation {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .c-head {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
    padding: 16px 22px;
    border-bottom: 1px solid var(--line-soft);
  }

  .c-title {
    font-size: 14px;
    font-weight: 600;
  }

  .c-sub {
    font-size: 12.5px;
    color: var(--muted);
  }

  .back {
    display: none;
  }

  .log {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 22px;
    overflow-y: auto;
  }

  .msg {
    max-width: 72%;
    align-self: flex-start;
  }

  .msg.mine {
    align-self: flex-end;
    text-align: right;
  }

  .m-meta {
    margin-bottom: 4px;
    font-size: 11.5px;
    color: var(--muted);
  }

  .bubble {
    display: inline-block;
    padding: 11px 14px;
    border-radius: 12px;
    background: var(--mist);
    font-size: 13.5px;
    line-height: 1.5;
    text-align: left;
  }

  .mine .bubble {
    background: var(--ink);
    color: var(--paper);
  }

  .compose {
    display: flex;
    gap: 10px;
    padding: 14px 18px;
    border-top: 1px solid var(--line-soft);
  }

  .send-error {
    padding: 0 18px 12px;
  }

  @media (max-width: 760px) {
    .inbox {
      height: auto;
      min-height: 0;
    }

    .inbox[data-thread='true'] {
      height: calc(100vh - 190px);
      min-height: 420px;
    }

    .threads {
      width: 100%;
      border-right: none;
    }

    .conversation {
      display: none;
    }

    .inbox[data-thread='true'] .threads {
      display: none;
    }

    .inbox[data-thread='true'] .conversation {
      display: flex;
    }

    .back {
      display: inline-flex;
      width: 100%;
      justify-content: flex-start;
    }

    .msg {
      max-width: 86%;
    }
  }
</style>
