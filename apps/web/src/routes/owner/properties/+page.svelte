<script lang="ts">
  import { DISTRICTS, type OwnerOverview, type OwnerUnit, type RegisterPropertyBody } from '@housing/shared';
  import { page } from '$app/state';
  import { api } from '$lib/api';
  import { action, resource } from '$lib/resource.svelte';
  import { fullAddress, mvr, rooms } from '$lib/format';
  import LoadState from '$lib/components/LoadState.svelte';
  import Pill from '$lib/components/Pill.svelte';

  const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  const overview = resource(() => api.get<OwnerOverview>('/owner/overview'));

  const EMPTY = { title: '', house: '', goalhi: '', district: DISTRICTS[0] as string, propertyType: 'Apartment', roomCount: '2', monthlyRent: '' };
  let formOpen = $state(page.url.searchParams.get('register') === '1');
  let f = $state({ ...EMPTY });
  let touched = $state(false);
  const submit = action();

  const rentValue = $derived(Number(f.monthlyRent.replace(/\D/g, '')));
  const missing = $derived({ title: !f.title.trim(), house: !f.house.trim(), goalhi: !f.goalhi.trim(), rent: !rentValue });
  const invalid = $derived(Object.values(missing).some(Boolean));
  const units = $derived(overview.data?.units ?? []);

  function close() {
    formOpen = false;
    f = { ...EMPTY };
    touched = false;
    submit.clear();
  }

  async function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    touched = true;
    if (invalid) return;
    const body: RegisterPropertyBody = {
      title: f.title.trim(),
      house: f.house.trim(),
      goalhi: f.goalhi.trim(),
      district: f.district,
      propertyType: f.propertyType as RegisterPropertyBody['propertyType'],
      roomCount: Number(f.roomCount),
      monthlyRent: rentValue
    };
    const unit = await submit.run(() => api.post<OwnerUnit>('/owner/properties', body));
    if (unit && overview.data) {
      overview.set({ ...overview.data, units: [...overview.data.units, unit] });
      close();
    }
  }
</script>

<svelte:head><title>My properties · Owner Portal</title></svelte:head>

<div class="head">
  <div>
    <h1 class="page-title">My properties</h1>
    <p class="page-lede">
      {#if overview.data}{NUMBER_WORDS[units.length] ?? units.length} registered {units.length === 1 ? 'unit' : 'units'}.{/if}
      Branch office verifies every new listing.
    </p>
  </div>
  <button type="button" class="btn btn-primary" onclick={() => (formOpen = true)}>Register new apartment</button>
</div>

{#if formOpen}
  <form class="sheet register" onsubmit={onSubmit} novalidate>
    <div class="form-head">
      <h2 class="form-title">Register new apartment</h2>
      <button type="button" class="close" onclick={close}>Close</button>
    </div>
    <div class="grid">
      <label class="field">
        Unit name
        <input class="input" bind:value={f.title} placeholder="e.g. Sea Breeze 3B" aria-invalid={touched && missing.title} />
      </label>
      <label class="field">
        House / plot name
        <input class="input" bind:value={f.house} placeholder="e.g. Fehivinaresge" aria-invalid={touched && missing.house} />
      </label>
      <label class="field">
        Goalhi / magu
        <input class="input" bind:value={f.goalhi} placeholder="e.g. Orchid Magu" aria-invalid={touched && missing.goalhi} />
      </label>
      <label class="field">
        District / island
        <select class="input" bind:value={f.district}>
          {#each DISTRICTS as d}<option>{d}</option>{/each}
        </select>
      </label>
      <label class="field">
        Property type
        <select class="input" bind:value={f.propertyType}><option>Apartment</option><option>Flat</option></select>
      </label>
      <label class="field">
        Rooms
        <select class="input" bind:value={f.roomCount}>
          {#each ['1', '2', '3', '4', '5'] as n}<option>{n}</option>{/each}
        </select>
      </label>
      <label class="field">
        Monthly rent (MVR)
        <input class="input" bind:value={f.monthlyRent} inputmode="numeric" placeholder="e.g. 18,500" aria-invalid={touched && missing.rent} />
      </label>
    </div>
    {#if touched && invalid}<p class="form-error" role="alert">Fill in the unit name, address and monthly rent.</p>{/if}
    {#if submit.error}<p class="form-error" role="alert">{submit.error}</p>{/if}
    <div class="form-actions">
      <button type="button" class="btn" onclick={close}>Cancel</button>
      <button type="submit" class="btn btn-moss" disabled={submit.busy}>{submit.busy ? 'Submitting…' : 'Submit for verification'}</button>
    </div>
  </form>
{/if}

<div class="list">
  <LoadState loading={overview.loading} error={overview.error} retry={overview.reload}>
    {#if units.length === 0}
      <p class="empty">No apartments registered yet.</p>
    {:else}
      <div class="scroll-x">
        <table class="ledger units">
          <thead>
            <tr><th>Unit</th><th class="w-type">Type</th><th class="end w-rent">Rent</th><th class="end w-status">Status</th></tr>
          </thead>
          <tbody>
            {#each units as u (u.id)}
              <tr>
                <td>
                  <div class="cell-title">{u.title}</div>
                  <div class="cell-sub">{fullAddress(u)}</div>
                </td>
                <td class="type">{u.propertyType} · {rooms(u.roomCount)}</td>
                <td class="end rent">{mvr(u.monthlyRent)}</td>
                <td class="end">
                  <Pill
                    status={u.approvalStatus === 'PENDING' ? 'PENDING_APPROVAL' : u.approvalStatus === 'REJECTED' ? 'REJECTED' : u.status}
                    label={u.approvalStatus === 'PENDING' ? 'Pending verification' : u.approvalStatus === 'REJECTED' ? 'Returned by branch' : undefined}
                  />
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
  .head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px 32px;
    flex-wrap: wrap;
  }

  .register {
    margin-top: 32px;
    border-color: rgba(21, 65, 83, 0.14);
  }

  .form-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 20px;
  }

  .form-title {
    font-size: 16px;
  }

  .close {
    border: none;
    background: none;
    padding: 0;
    font-size: 13px;
    color: var(--muted);
  }

  .close:hover {
    color: var(--ink);
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px 28px;
    margin-top: 22px;
  }

  .form-actions {
    margin-top: 24px;
  }

  .form-error {
    margin-top: 14px;
  }

  .list {
    margin-top: 36px;
  }

  .units {
    min-width: 640px;
  }

  .units td {
    padding-block: 18px;
    vertical-align: middle;
  }

  .w-type {
    width: 150px;
  }

  .w-rent {
    width: 130px;
  }

  .w-status {
    width: 170px;
  }

  .type {
    font-size: 13px;
    color: var(--ink-soft);
  }

  .rent {
    color: var(--ink-soft);
  }

  @media (max-width: 640px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
