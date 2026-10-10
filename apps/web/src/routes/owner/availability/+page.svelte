<script lang="ts">
  import type { OwnerOverview, OwnerUnit } from '@housing/shared';
  import { api } from '$lib/api';
  import { action, resource } from '$lib/resource.svelte';
  import { date, fullAddress, monthLong, monthShort, mvr, rooms, termLabel } from '$lib/format';
  import LoadState from '$lib/components/LoadState.svelte';

  type Target = 'AVAILABLE' | 'RENTED' | 'UNDER_MAINTENANCE';
  const OPTIONS: { key: Target; label: string; title?: string }[] = [
    { key: 'AVAILABLE', label: 'Available' },
    { key: 'RENTED', label: 'Rented' },
    { key: 'UNDER_MAINTENANCE', label: 'Maintenance', title: 'Under Maintenance' }
  ];
  const CAPTION: Record<string, string> = {
    AVAILABLE: 'Visible in client searches. Open for viewing requests.',
    RENTED: 'Active contract locked. Removed from new client enquiries.',
    UNDER_MAINTENANCE: 'Hidden from active client searches.'
  };
  const EFFECT: Record<Target, string> = {
    AVAILABLE: 'returns to client search results and starts accepting viewing requests.',
    RENTED: 'is locked to a contract and a lease ledger opens for this unit.',
    UNDER_MAINTENANCE: 'is hidden from active client searches. New enquiries stop.'
  };

  const overview = resource(() => api.get<OwnerOverview>('/owner/overview'));
  const live = $derived((overview.data?.units ?? []).filter((u) => u.approvalStatus === 'APPROVED'));

  let dialog = $state<HTMLDialogElement>();
  let pending = $state<{ unit: OwnerUnit; target: Target } | null>(null);
  let blocked = $state<OwnerUnit | null>(null);
  const change = action();

  function ask(unit: OwnerUnit, target: Target) {
    if (unit.status === target) return;
    change.clear();
    if (target === 'AVAILABLE' && unit.lease?.status === 'ACTIVE') {
      blocked = unit;
      pending = null;
    } else {
      blocked = null;
      pending = { unit, target };
    }
    dialog?.showModal();
  }

  async function confirm() {
    if (!pending) return;
    const { unit, target } = pending;
    const updated = await change.run(() => api.patch<OwnerUnit>(`/owner/properties/${unit.id}/status`, { status: target }));
    if (updated && overview.data) {
      overview.set({ ...overview.data, units: overview.data.units.map((u) => (u.id === updated.id ? updated : u)) });
      dialog?.close();
    }
  }
</script>

<svelte:head><title>Availability · Owner Portal</title></svelte:head>

<h1 class="page-title">Availability</h1>
<p class="page-lede">Set each unit's listing status. Changes apply to client searches immediately.</p>

<div class="list">
  <LoadState loading={overview.loading} error={overview.error} retry={overview.reload} rows={6}>
    {#if live.length === 0}
      <p class="empty">No verified units yet. Units appear here once the branch approves them.</p>
    {/if}
    {#each live as u (u.id)}
      {@const locked = u.lease?.status === 'ACTIVE'}
      <article class="row">
        <div class="row-top">
          <div class="info">
            <div class="name-line">
              <h2 class="name">{u.title}</h2>
              {#if locked}<span class="pill pill-ink">Locked</span>{/if}
            </div>
            <div class="cell-sub">{fullAddress(u)}</div>
            <div class="spec">{u.propertyType} · {rooms(u.roomCount)} · {mvr(u.monthlyRent)} / month</div>
          </div>
          <div class="control">
            <div class="seg" role="group" aria-label="Listing status for {u.title}">
              {#each OPTIONS as o}
                <button
                  type="button"
                  class="seg-btn"
                  data-tone={o.key}
                  aria-pressed={u.status === o.key}
                  aria-disabled={o.key === 'AVAILABLE' && locked}
                  onclick={() => ask(u, o.key)}>{o.label}</button
                >
              {/each}
            </div>
            <p class="caption">{CAPTION[u.status] ?? ''}</p>
          </div>
        </div>

        {#if u.lease && (u.status === 'RENTED' || u.lease.status === 'AWAITING_SIGNATURE')}
          {@const l = u.lease}
          <div class="sheet ledger-sheet">
            <div class="section-head">
              <h3 class="sheet-title">Lease contract · {l.reference}</h3>
              <span class="withheld">Tenant identity withheld</span>
            </div>
            <div class="lease-grid">
              <div>
                <div class="k">Lease</div>
                <div class="v">{date(l.startDate)} · {termLabel(l.termMonths)}<br /><span class="muted">Ends {date(l.expiryDate)}</span></div>
              </div>
              {#if l.current}
                <div>
                  <div class="k">{monthLong(l.current.month)} rent</div>
                  <div class="v">
                    <span class="pay" data-state={l.current.status}>{l.current.status === 'PAID' ? 'Paid' : l.current.status === 'OVERDUE' ? 'Overdue' : 'Pending'}</span><br />
                    <span class="muted">
                      {l.current.status === 'PAID'
                        ? `${mvr(l.current.amount)} received ${date(l.current.paymentDate)}.`
                        : l.current.status === 'OVERDUE'
                          ? `Due ${date(l.current.dueDate)}. Reminder sent to branch office.`
                          : `${mvr(l.current.amount)} due ${date(l.current.dueDate)}.`}
                    </span>
                  </div>
                </div>
              {/if}
              {#if l.history.length}
                <div class="history-cell">
                  <div class="k">Last {l.history.length} months</div>
                  <ol class="history">
                    {#each l.history as h (h.month)}
                      <li>
                        <span class="h-mark" data-state={h.status}>{h.status === 'PAID' ? 'Paid' : h.status === 'OVERDUE' ? 'Late' : 'Due'}</span>
                        <span class="h-month">{monthShort(h.month)}</span>
                      </li>
                    {/each}
                  </ol>
                </div>
              {/if}
            </div>
            {#if locked}
              <p class="ledger-foot">Cannot be set to Available while this contract is active.</p>
            {/if}
          </div>
        {/if}
      </article>
    {/each}
  </LoadState>
</div>

<dialog bind:this={dialog} class="sheet confirm" aria-labelledby="dlg-title" onclose={() => change.clear()}>
  {#if blocked}
    <h2 id="dlg-title" class="sheet-title">Contract still active</h2>
    <p class="dlg-body">{blocked.title} cannot be set to Available while lease {blocked.lease?.reference} is running. Terminate or let the contract lapse first.</p>
    <div class="form-actions">
      <button type="button" class="btn" onclick={() => dialog?.close()}>Close</button>
    </div>
  {:else if pending}
    <h2 id="dlg-title" class="sheet-title">Set to {OPTIONS.find((o) => o.key === pending?.target)?.title ?? OPTIONS.find((o) => o.key === pending?.target)?.label}?</h2>
    <p class="dlg-body">{pending.unit.title} — {EFFECT[pending.target]}</p>
    {#if change.error}<p class="form-error" role="alert">{change.error}</p>{/if}
    <div class="form-actions">
      <button type="button" class="btn" onclick={() => dialog?.close()}>Cancel</button>
      <button type="button" class="btn btn-primary" onclick={confirm} disabled={change.busy}>{change.busy ? 'Saving…' : 'Confirm change'}</button>
    </div>
  {/if}
</dialog>

<style>
  .list {
    margin-top: 28px;
  }

  .row {
    padding: 24px 0;
    border-bottom: 1px solid var(--line);
  }

  .row-top {
    display: flex;
    align-items: flex-start;
    gap: 20px 28px;
    flex-wrap: wrap;
  }

  .info {
    flex: 1;
    min-width: min(100%, 260px);
  }

  .name-line {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .name {
    font-family: var(--font-body);
    font-size: 15.5px;
    font-weight: 600;
  }

  .spec {
    margin-top: 9px;
    font-size: 12.5px;
    color: var(--ink-soft);
  }

  .control {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 9px;
  }

  .seg {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .seg-btn {
    min-height: 36px;
    padding: 8px 15px;
    border: 1px solid rgba(21, 65, 83, 0.2);
    border-radius: 8px;
    background: transparent;
    color: var(--ink-soft);
    font-size: 12.5px;
    white-space: nowrap;
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease;
  }

  .seg-btn:hover {
    border-color: var(--ink);
  }

  .seg-btn[aria-disabled='true'] {
    color: rgba(21, 65, 83, 0.4);
    border-style: dashed;
  }

  .seg-btn[aria-pressed='true'] {
    font-weight: 600;
  }

  .seg-btn[aria-pressed='true'][data-tone='AVAILABLE'] {
    background: var(--sage);
    border-color: var(--sage);
    color: var(--ink);
  }

  .seg-btn[aria-pressed='true'][data-tone='RENTED'] {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--paper);
  }

  .seg-btn[aria-pressed='true'][data-tone='UNDER_MAINTENANCE'] {
    background: var(--moss-deep);
    border-color: var(--moss-deep);
    color: #fff;
  }

  .caption {
    max-width: 320px;
    font-size: 12px;
    text-align: right;
    color: var(--muted);
  }

  .ledger-sheet {
    margin-top: 20px;
    padding: 22px 24px;
    border-radius: 12px;
  }

  .sheet-title {
    font-size: 13.5px;
  }

  .withheld {
    font-size: 12px;
    color: var(--muted);
  }

  .lease-grid {
    display: grid;
    grid-template-columns: minmax(150px, 1fr) minmax(150px, 1fr) auto;
    gap: 24px 28px;
    margin-top: 18px;
  }

  .k {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .v {
    margin-top: 7px;
    font-size: 13.5px;
    line-height: 1.7;
  }

  .muted {
    color: var(--muted);
  }

  .history {
    display: flex;
    flex-wrap: nowrap;
    gap: 5px;
    margin: 8px 0 0;
    padding: 0;
    list-style: none;
  }

  .history li {
    width: 50px;
    text-align: center;
  }

  .h-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    border-radius: 6px;
    background: var(--sage);
    font-size: 10px;
    font-weight: 600;
  }

  .h-mark[data-state='OVERDUE'] {
    background: rgba(21, 65, 83, 0.12);
  }

  .pay {
    font-weight: 600;
  }

  .pay[data-state='PAID'] {
    color: var(--moss-deep);
  }

  .h-mark[data-state='PENDING'] {
    background: transparent;
    border: 1px dashed rgba(21, 65, 83, 0.4);
  }

  .h-month {
    display: block;
    margin-top: 5px;
    font-size: 11px;
    color: var(--muted);
  }

  .ledger-foot {
    margin-top: 20px;
    padding-top: 14px;
    border-top: 1px solid var(--line-soft);
    font-size: 12px;
    color: var(--muted);
  }

  .confirm {
    width: min(420px, calc(100vw - 32px));
    padding: 26px;
    color: var(--ink);
    box-shadow: 0 24px 56px -20px rgba(21, 65, 83, 0.5);
  }

  .confirm::backdrop {
    background: rgba(21, 65, 83, 0.4);
  }

  .confirm .sheet-title {
    font-size: 16px;
  }

  .dlg-body {
    margin-top: 10px;
    font-size: 13.5px;
    line-height: 1.6;
    color: var(--ink-soft);
  }

  @media (max-width: 900px) {
    .lease-grid {
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }

    .history-cell {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 640px) {
    .history li {
      width: 44px;
    }

    .h-mark {
      font-size: 9.5px;
    }

    .control {
      align-items: flex-start;
      width: 100%;
    }

    .caption {
      text-align: left;
    }
  }
</style>
