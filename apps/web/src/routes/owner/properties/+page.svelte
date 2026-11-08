<script lang="ts">
  import { DISTRICTS, type OwnerOverview, type OwnerUnit, type RegisterPropertyBody } from '@housing/shared';
  import { page } from '$app/state';
  import { api } from '$lib/api';
  import { action, resource } from '$lib/resource.svelte';
  import { fullAddress, mvr, rooms } from '$lib/format';
  import LoadState from '$lib/components/LoadState.svelte';
  import Pill from '$lib/components/Pill.svelte';
  import Icon from '$lib/components/Icon.svelte';

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
  let openReview = $state<string | null>(null);

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
              {@const returned = u.approvalStatus === 'REJECTED'}
              {@const open = returned && openReview === u.id}
              <tr class:has-review={open}>
                <td>
                  <div class="cell-title">{u.title}</div>
                  <div class="cell-sub">{fullAddress(u)}</div>
                </td>
                <td class="type">{u.propertyType} · {rooms(u.roomCount)}</td>
                <td class="end rent">{mvr(u.monthlyRent)}</td>
                <td class="end">
                  {#if returned}
                    <button
                      type="button"
                      class="review-toggle"
                      aria-expanded={open}
                      aria-controls="review-{u.id}"
                      onclick={() => (openReview = open ? null : u.id)}
                    >
                      <Pill status="REJECTED" label="Returned by branch" />
                      <span class="chevron" class:up={open} aria-hidden="true">▾</span>
                      <span class="visually-hidden">{open ? 'Hide' : 'Show'} why</span>
                    </button>
                  {:else}
                    <Pill
                      status={u.approvalStatus === 'PENDING' ? 'PENDING_APPROVAL' : u.status}
                      label={u.approvalStatus === 'PENDING' ? 'Pending verification' : undefined}
                    />
                  {/if}
                </td>
              </tr>
              {#if open}
                <tr class="review-row" id="review-{u.id}">
                  <td colspan="4">
                    {#if u.review && u.review.passed.length + u.review.missing.length > 0}
                      <p class="review-lede">
                        {#if u.review.missing.length}
                          The branch returned this listing because {u.review.missing.length === 1 ? 'one check is' : `${u.review.missing.length} checks are`} not met yet.
                        {:else}
                          The branch returned this listing. Every check passed; contact your branch office for details.
                        {/if}
                      </p>
                      <ul class="review-checks">
                        {#each u.review.missing as c (c)}
                          <li class="missing"><Icon name="x" size={14} strokeWidth={2.25} /><s>{c}</s><span class="tag">Missing</span></li>
                        {/each}
                        {#each u.review.passed as c (c)}
                          <li class="passed"><Icon name="check" size={14} strokeWidth={2.25} />{c}</li>
                        {/each}
                      </ul>
                    {:else}
                      <p class="review-lede">No check details were recorded for this return. Contact your branch office to find out what is needed.</p>
                    {/if}
                  </td>
                </tr>
              {/if}
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

  .review-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    border: none;
    background: none;
    color: var(--muted);
    cursor: pointer;
  }

  .review-toggle:hover {
    color: var(--ink);
  }

  .review-toggle:focus-visible {
    outline: 2px solid var(--moss);
    outline-offset: 3px;
    border-radius: 999px;
  }

  .chevron {
    font-size: 12px;
    line-height: 1;
    transition: transform 0.15s ease;
  }

  .chevron.up {
    transform: rotate(180deg);
  }

  .units tr.has-review td {
    border-bottom-color: transparent;
  }

  .units .review-row td {
    padding-block: 0 18px;
  }

  .review-lede {
    font-size: 13px;
    color: var(--ink-soft);
  }

  .review-checks {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 10px 0 0;
    padding: 12px 14px;
    list-style: none;
    background: var(--mist);
    border-radius: 10px;
  }

  .review-checks li {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 13px;
  }

  .review-checks .missing {
    color: var(--ink);
  }

  .review-checks .missing s {
    text-decoration-thickness: 1.5px;
    text-decoration-color: rgba(21, 65, 83, 0.55);
  }

  .review-checks .passed {
    color: var(--moss-deep);
  }

  .tag {
    margin-left: auto;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--muted);
  }

  @media (max-width: 640px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
