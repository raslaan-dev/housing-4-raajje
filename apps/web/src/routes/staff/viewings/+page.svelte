<script lang="ts">
  import type { StaffOptions, StaffViewing } from '@housing/shared';
  import { api } from '$lib/api';
  import { action } from '$lib/resource.svelte';
  import { scoped } from '$lib/staff.svelte';
  import { date } from '$lib/format';
  import LoadState from '$lib/components/LoadState.svelte';
  import Pill from '$lib/components/Pill.svelte';

  const viewings = scoped((branch) => api.get<StaffViewing[]>('/staff/viewings', { branch }));
  const options = scoped((branch) => api.get<StaffOptions>('/staff/options', { branch }));

  const today = new Date().toISOString().slice(0, 10);
  let f = $state({ clientId: '', propertyId: '', date: today, feedbackMetric: 'None', notes: '' });
  const log = action();

  $effect(() => {
    const o = options.data;
    if (o && !f.clientId) f.clientId = o.clients[0]?.id ?? '';
    if (o && !f.propertyId) f.propertyId = o.properties[0]?.id ?? '';
  });

  const metricShort = (m: string | null) => (m && m !== 'None' ? m.replace(/\s*\(.*\)$/, '') : '—');

  async function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!f.clientId || !f.propertyId) return;
    const created = await log.run(() => api.post<StaffViewing>('/staff/viewings', { ...f, notes: f.notes.trim() || null }));
    if (created) {
      viewings.set([created, ...(viewings.data ?? [])]);
      f.notes = '';
    }
  }
</script>

<svelte:head><title>Viewings · Staff Portal</title></svelte:head>

<h1 class="page-title">Viewings &amp; feedback</h1>
<p class="page-lede">Log each escorted viewing. Feedback is shared with owners without the client's identity.</p>

<form class="sheet log" onsubmit={onSubmit}>
  <div class="form-grid">
    <label class="field">
      Client
      <select class="input" bind:value={f.clientId} disabled={!options.data}>
        {#each options.data?.clients ?? [] as c (c.id)}<option value={c.id}>{c.code} · {c.name}</option>{/each}
      </select>
    </label>
    <label class="field">
      Apartment
      <select class="input" bind:value={f.propertyId} disabled={!options.data}>
        {#each options.data?.properties ?? [] as p (p.id)}<option value={p.id}>{p.title}</option>{/each}
      </select>
    </label>
    <label class="field">Date<input class="input" type="date" bind:value={f.date} max={today} /></label>
    <label class="field">
      Feedback
      <select class="input" bind:value={f.feedbackMetric}>
        {#each options.data?.feedbackMetrics ?? ['None'] as m}<option value={m}>{m}</option>{/each}
      </select>
    </label>
  </div>
  <div class="log-row">
    <label class="field grow">
      Client comments
      <input class="input" bind:value={f.notes} placeholder="e.g. Asked if rent is negotiable" />
    </label>
    <button type="submit" class="btn btn-primary" disabled={log.busy || !options.data}>{log.busy ? 'Logging…' : 'Log viewing'}</button>
  </div>
  {#if log.error}<p class="form-error" role="alert">{log.error}</p>{/if}
</form>

<div class="list">
  <LoadState loading={viewings.loading && !viewings.data} error={viewings.error} retry={viewings.reload} rows={6}>
    {#if !viewings.data?.length}
      <p class="empty">No viewings logged for this branch yet.</p>
    {:else}
      <div class="scroll-x">
        <table class="ledger wide">
          <thead>
            <tr><th>Date</th><th>Client</th><th>Apartment</th><th>Staff</th><th>Feedback</th><th>Comments</th><th class="end">Status</th></tr>
          </thead>
          <tbody>
            {#each viewings.data as v (v.id)}
              <tr>
                <td class="meta">{date(v.date)}</td>
                <td>{v.client.code}</td>
                <td class="strong">{v.property.title}</td>
                <td class="meta">{v.staff?.name ?? 'Unassigned'}</td>
                <td>{metricShort(v.feedbackMetric)}</td>
                <td class="meta">{v.notes ?? '—'}</td>
                <td class="end"><Pill status={v.status} /></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </LoadState>
</div>

<style>
  .log {
    margin-top: 28px;
    padding: 22px 24px;
  }

  .log-row {
    display: flex;
    align-items: flex-end;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 16px;
  }

  .grow {
    flex: 1;
    min-width: min(100%, 260px);
  }

  .list {
    margin-top: 30px;
  }

  .wide {
    min-width: 860px;
  }
</style>
