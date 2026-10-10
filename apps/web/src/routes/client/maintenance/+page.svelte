<script lang="ts">
  import { MAINTENANCE_CATEGORIES, type MaintenanceItem } from '@housing/shared';
  import { api } from '$lib/api';
  import { action, resource } from '$lib/resource.svelte';
  import { date } from '$lib/format';
  import LoadState from '$lib/components/LoadState.svelte';
  import Pill from '$lib/components/Pill.svelte';

  const requests = resource(() => api.get<MaintenanceItem[]>('/client/maintenance'));
  let category = $state<string>(MAINTENANCE_CATEGORIES[0]);
  let description = $state('');
  let touched = $state(false);
  const submit = action();

  async function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    touched = true;
    if (!description.trim()) return;
    const created = await submit.run(() =>
      api.post<MaintenanceItem>('/client/maintenance', { category, description: description.trim() })
    );
    if (created) {
      requests.set([created, ...(requests.data ?? [])]);
      description = '';
      touched = false;
    }
  }
</script>

<svelte:head><title>Maintenance · Client Portal</title></svelte:head>

<h1 class="page-title">Maintenance</h1>
<p class="page-lede">Requests go to the owner and your branch office.</p>

<div class="split body">
  <form class="sheet stack" onsubmit={onSubmit} novalidate>
    <h2 class="sheet-title">New request</h2>
    <label class="field">
      Category
      <select class="input" bind:value={category}>
        {#each MAINTENANCE_CATEGORIES as c}<option>{c}</option>{/each}
      </select>
    </label>
    <label class="field">
      Description
      <textarea
        class="input"
        rows="5"
        bind:value={description}
        placeholder="What needs fixing, and where?"
        aria-invalid={touched && !description.trim()}
        aria-describedby="desc-hint"
      ></textarea>
      {#if touched && !description.trim()}<span id="desc-hint" class="form-error">Describe the problem so staff know what to bring.</span>{/if}
    </label>
    {#if submit.error}<p class="form-error" role="alert">{submit.error}</p>{/if}
    <div>
      <button type="submit" class="btn btn-primary" disabled={submit.busy}>{submit.busy ? 'Submitting…' : 'Submit request'}</button>
    </div>
  </form>

  <section aria-label="Your requests">
    <LoadState loading={requests.loading} error={requests.error} retry={requests.reload}>
      {#if !requests.data?.length}
        <p class="empty">No maintenance requests yet.</p>
      {:else}
        <div class="scroll-x">
          <table class="ledger">
            <thead><tr><th>Ref</th><th>Request</th><th class="end">Status</th></tr></thead>
            <tbody>
              {#each requests.data as r (r.id)}
                <tr>
                  <td class="meta">{r.reference}</td>
                  <td>
                    <div class="strong">{r.category}</div>
                    <div class="cell-sub">{r.issue} · {date(r.createdAt)}</div>
                  </td>
                  <td class="end"><Pill status={r.status} /></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </LoadState>
  </section>
</div>

<style>
  .body {
    margin-top: 32px;
  }
</style>
