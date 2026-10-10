<script lang="ts">
  import type { QueueItem } from '@housing/shared';
  import { api } from '$lib/api';
  import { action } from '$lib/resource.svelte';
  import { scoped, scopeParam } from '$lib/staff.svelte';
  import { branchLabel, date } from '$lib/format';
  import Icon from '$lib/components/Icon.svelte';
  import LoadState from '$lib/components/LoadState.svelte';

  const queue = scoped((branch) => api.get<QueueItem[]>('/staff/queue', { branch }));
  let selectedId = $state<string | null>(null);
  let checked = $state<Record<string, string[]>>({});
  let resolved = $state<string | null>(null);

  const items = $derived(queue.data ?? []);
  const sel = $derived(items.find((q) => q.id === selectedId) ?? items[0]);
  const ticks = $derived(sel ? (checked[sel.id] ?? []) : []);
  const allChecked = $derived(!!sel && sel.checks.every((c) => ticks.includes(c)));

  const decide = action();

  function toggle(check: string) {
    if (!sel) return;
    const cur = checked[sel.id] ?? [];
    checked[sel.id] = cur.includes(check) ? cur.filter((c) => c !== check) : [...cur, check];
  }

  async function resolve(kind: 'approve' | 'return') {
    if (!sel) return;
    const item = sel;
    const ok = await decide.run(() =>
      api.post(`/staff/queue/${item.kind}/${item.id}/${kind}`, kind === 'approve' ? { checks: ticks } : {})
    );
    if (ok !== undefined) {
      resolved = `${kind === 'approve' ? 'Approved' : 'Returned'} ${item.kind === 'PROPERTY' ? 'registration' : 'application'} ${item.reference}.`;
      queue.set(items.filter((q) => q.id !== item.id));
      selectedId = null;
    }
  }

  const kindLabel = (k: QueueItem['kind']) => (k === 'PROPERTY' ? 'Apartment registration' : 'Client application');
</script>

<svelte:head><title>Verification queue · Staff Portal</title></svelte:head>

<h1 class="page-title">Verification queue</h1>
<p class="page-lede">
  {items.length} awaiting compliance checks · {scopeParam() === 'all' ? 'All branches' : branchLabel(items[0]?.branch ?? null)}
</p>

{#if resolved}
  <div class="notice notice-row top" role="status">
    <span>{resolved} The applicant has been notified.</span>
    <button type="button" class="btn btn-quiet" onclick={() => (resolved = null)}>Dismiss</button>
  </div>
{/if}

<div class="body">
  <LoadState loading={queue.loading && !queue.data} error={queue.error} retry={queue.reload} rows={6}>
    {#if items.length === 0}
      <p class="empty">Queue is clear for this branch.</p>
    {:else if sel}
      <div class="split">
        <ul class="items" aria-label="Waiting items">
          {#each items as q (q.id)}
            <li>
              <button type="button" class="item" aria-current={q.id === sel.id ? 'true' : undefined} onclick={() => (selectedId = q.id)}>
                <span class="item-title">{q.title}</span>
                <span class="item-sub">{q.subtitle}</span>
                <span class="item-date">{date(q.createdAt)} · {branchLabel(q.branch)}</span>
              </button>
            </li>
          {/each}
        </ul>

        <section class="sheet review" aria-labelledby="sel-h">
          <div class="review-meta">{kindLabel(sel.kind)} · {sel.reference}</div>
          <h2 class="review-title" id="sel-h">{sel.title}</h2>
          <dl class="kv facts">
            {#each sel.fields as f (f.label)}
              <div><dt>{f.label}</dt><dd>{f.value}</dd></div>
            {/each}
          </dl>

          <fieldset class="checks">
            <legend>Compliance checks</legend>
            {#each sel.checks as c (c)}
              {@const on = ticks.includes(c)}
              <label class="check">
                <input type="checkbox" checked={on} onchange={() => toggle(c)} />
                <span class="box" aria-hidden="true">{#if on}<Icon name="check" size={13} />{/if}</span>
                {c}
              </label>
            {/each}
          </fieldset>

          {#if decide.error}<p class="form-error" role="alert">{decide.error}</p>{/if}
          <div class="actions">
            <button type="button" class="btn btn-primary" onclick={() => resolve('approve')} disabled={!allChecked || decide.busy}>
              Approve and publish
            </button>
            <button type="button" class="btn" onclick={() => resolve('return')} disabled={decide.busy}>Return to applicant</button>
          </div>
        </section>
      </div>
    {/if}
  </LoadState>
</div>

<style>
  .top {
    margin-top: 22px;
  }

  .body {
    margin-top: 30px;
  }

  .items {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .item {
    display: block;
    width: 100%;
    padding: 16px 18px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: transparent;
    text-align: left;
    transition:
      border-color 0.15s ease,
      background-color 0.15s ease;
  }

  .item:hover {
    border-color: rgba(21, 65, 83, 0.35);
  }

  .item[aria-current='true'] {
    border-color: var(--ink);
    background: var(--sheet);
  }

  .item-title {
    display: block;
    font-size: 14.5px;
    font-weight: 600;
  }

  .item-sub,
  .item-date {
    display: block;
    margin-top: 3px;
    font-size: 12.5px;
    color: var(--muted);
  }

  .review-meta {
    font-size: 12.5px;
    color: var(--muted);
  }

  .review-title {
    margin-top: 4px;
    font-size: 22px;
  }

  .facts {
    margin: 18px 0 0;
    gap: 0;
  }

  .facts > div {
    padding: 10px 0;
    border-bottom: 1px solid var(--line-soft);
  }

  .checks {
    margin: 22px 0 0;
    padding: 0;
    border: none;
  }

  .checks legend {
    margin-bottom: 8px;
    padding: 0;
    font-size: 13px;
    font-weight: 600;
  }

  .check {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 0;
    font-size: 13.5px;
    cursor: pointer;
  }

  .check input {
    position: absolute;
    opacity: 0;
    width: 20px;
    height: 20px;
    margin: 0;
  }

  .box {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: 1px solid rgba(21, 65, 83, 0.35);
    border-radius: 5px;
    color: #fff;
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease;
  }

  .check input:checked + .box {
    background: var(--moss-deep);
    border-color: var(--moss-deep);
  }

  .check input:focus-visible + .box {
    outline: 2px solid var(--moss);
    outline-offset: 2px;
  }

  .actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 22px;
  }

</style>
