<script lang="ts">
  import type { Inquiry, StaffOptions } from '@housing/shared';
  import { api } from '$lib/api';
  import { action } from '$lib/resource.svelte';
  import { scoped } from '$lib/staff.svelte';
  import { shortDate } from '$lib/format';
  import LoadState from '$lib/components/LoadState.svelte';

  const inquiries = scoped((branch) => api.get<Inquiry[]>('/staff/inquiries', { branch }));
  const options = scoped((branch) => api.get<StaffOptions>('/staff/options', { branch }));
  let choice = $state<Record<string, string>>({});
  let routing = $state<string | null>(null);
  const route = action();

  const specialistFor = (id: string) => choice[id] ?? options.data?.specialists[0]?.id ?? '';

  async function send(q: Inquiry) {
    const specialistId = specialistFor(q.id);
    if (!specialistId) return;
    routing = q.id;
    const updated = await route.run(() => api.post<Inquiry>(`/staff/inquiries/${q.id}/route`, { specialistId }));
    if (updated && inquiries.data) inquiries.set(inquiries.data.map((x) => (x.id === updated.id ? updated : x)));
    routing = null;
  }
</script>

<svelte:head><title>Inquiries · Staff Portal</title></svelte:head>

<h1 class="page-title">Inquiries</h1>
<p class="page-lede">Route walk-in, phone and web inquiries to a property specialist.</p>

<div class="list">
  <LoadState loading={inquiries.loading && !inquiries.data} error={inquiries.error} retry={inquiries.reload} rows={5}>
    {#if route.error}<p class="form-error" role="alert">{route.error}</p>{/if}
    {#if !inquiries.data?.length}
      <p class="empty">No inquiries waiting.</p>
    {:else}
      <div class="scroll-x">
        <table class="ledger wide">
          <thead><tr><th>From</th><th>Regarding</th><th>Channel</th><th class="end">Route to</th></tr></thead>
          <tbody>
            {#each inquiries.data as q (q.id)}
              <tr>
                <td>
                  <div class="strong">{q.name}</div>
                  <div class="cell-sub">{q.phone} · {shortDate(q.createdAt)}</div>
                </td>
                <td>{q.about}</td>
                <td class="meta">{q.channel}</td>
                <td class="end">
                  {#if q.routedTo}
                    <span class="done">Routed to {q.routedTo.name}</span>
                  {:else}
                    <div class="route">
                      <label class="visually-hidden" for="to-{q.id}">Specialist for {q.name}</label>
                      <select
                        id="to-{q.id}"
                        class="input on-paper"
                        value={specialistFor(q.id)}
                        onchange={(e) => (choice[q.id] = e.currentTarget.value)}
                      >
                        {#each options.data?.specialists ?? [] as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
                      </select>
                      <button type="button" class="btn btn-primary btn-sm" onclick={() => send(q)} disabled={route.busy || !options.data?.specialists.length}>
                        {routing === q.id ? 'Routing…' : 'Route'}
                      </button>
                    </div>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </LoadState>
</div>

<style>
  .list {
    margin-top: 28px;
  }

  .wide {
    min-width: 820px;
  }

  .strong {
    font-weight: 600;
  }

  .route {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
  }

  .route .input {
    width: auto;
    min-height: 34px;
    padding-block: 6px;
    font-size: 12.5px;
  }

  .done {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--moss-deep);
  }
</style>
