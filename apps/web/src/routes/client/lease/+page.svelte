<script lang="ts">
  import type { ClientLease, NotificationItem } from '@housing/shared';
  import { api } from '$lib/api';
  import { action, resource } from '$lib/resource.svelte';
  import { date, fullAddress, monthLabel, monthLong, mvr, paymentLabel, shortDate, termLabel } from '$lib/format';
  import LoadState from '$lib/components/LoadState.svelte';
  import Pill from '$lib/components/Pill.svelte';

  const lease = resource(() => api.get<ClientLease | null>('/client/lease'));
  const notes = resource(() => api.get<NotificationItem[]>('/client/notifications'));

  const pay = action();
  const sign = action();

  async function payCurrent(month: string) {
    const updated = await pay.run(() => api.post<ClientLease>('/client/payments', { month }));
    if (updated) {
      lease.set(updated);
      notes.reload();
    }
  }

  async function signLease() {
    const updated = await sign.run(() => api.post<ClientLease>('/client/lease/sign'));
    if (updated) {
      lease.set(updated);
      notes.reload();
    }
  }
</script>

<svelte:head><title>My lease · Client Portal</title></svelte:head>

<LoadState loading={lease.loading} error={lease.error} retry={lease.reload} rows={6}>
  {#if !lease.data}
    <h1 class="page-title">My lease</h1>
    <p class="empty">
      You don't have a lease yet. When the branch drafts one for you, it appears here for you to sign.
      <a class="link" href="/client">Find a home</a>
    </p>
  {:else}
    {@const l = lease.data}
    {@const cur = l.current}
    <h1 class="page-title">My lease</h1>
    <p class="page-lede">{l.property.title} · {fullAddress(l.property)}</p>

    {#if l.status === 'AWAITING_SIGNATURE'}
      <div class="notice sign-row">
        <span>
          Lease {l.reference} is ready. It becomes active once you and the owner have both signed.
          {#if l.clientSigned}You signed on {date(l.clientSignedAt)}; waiting for the owner.{/if}
        </span>
        {#if !l.clientSigned}
          <button type="button" class="btn btn-primary" onclick={signLease} disabled={sign.busy}>
            {sign.busy ? 'Signing…' : 'Sign lease'}
          </button>
        {/if}
      </div>
      {#if sign.error}<p class="form-error" role="alert">{sign.error}</p>{/if}
    {/if}

    <div class="figures">
      <div>
        <div class="figure-value">{mvr(l.monthlyRent)}</div>
        <div class="figure-label">Monthly rent</div>
      </div>
      <div>
        <div class="figure-value">{date(l.expiryDate)}</div>
        <div class="figure-label">Lease ends · {termLabel(l.termMonths)}</div>
      </div>
      <div>
        <div class="figure-value">{mvr(l.advancePayment + l.securityDeposit)}</div>
        <div class="figure-label">Advance + deposit held</div>
      </div>
      {#if cur}
        <div>
          <div class="figure-value" class:is-positive={cur.status === 'PAID'}>
            {cur.status === 'PAID' ? 'Paid' : cur.status === 'OVERDUE' ? 'Overdue' : `Due ${shortDate(cur.dueDate)}`}
          </div>
          <div class="figure-label">{monthLong(cur.month)} rent</div>
        </div>
      {/if}
    </div>

    <div class="split body">
      <section aria-labelledby="pay-h">
        <div class="section-head">
          <h2 class="section-title" id="pay-h">Payments</h2>
          {#if cur && cur.status !== 'PAID' && l.status === 'ACTIVE'}
            <button type="button" class="btn btn-primary btn-sm" onclick={() => payCurrent(cur.month)} disabled={pay.busy}>
              {pay.busy ? 'Paying…' : `Pay ${monthLong(cur.month)} rent`}
            </button>
          {/if}
        </div>
        {#if pay.error}<p class="form-error" role="alert">{pay.error}</p>{/if}
        {#if l.payments.length === 0}
          <p class="empty">No rent is due yet. The first month starts on {date(l.startDate)}.</p>
        {:else}
          <div class="scroll-x">
            <table class="ledger">
              <thead>
                <tr><th>Month</th><th>Method</th><th class="end">Amount</th><th class="end">Status</th></tr>
              </thead>
              <tbody>
                {#each l.payments as p (p.month)}
                  <tr>
                    <td>{monthLabel(p.month)}</td>
                    <td class="meta">{p.paymentMethod ?? '—'}</td>
                    <td class="end">{mvr(p.amount)}</td>
                    <td class="end"><Pill status={p.status} label={paymentLabel(p.status, p.dueDate)} /></td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>

      <div class="stack side">
        <section aria-labelledby="sign-h">
          <h2 class="section-title" id="sign-h">Contract sign-offs · {l.reference}</h2>
          <ul class="rule-list">
            <li>
              <span>Client · you</span>
              {#if l.clientSigned}<span class="ok">Signed {date(l.clientSignedAt)}</span>{:else}<span class="wait">Not signed</span>{/if}
            </li>
            <li>
              <span>Owner</span>
              {#if l.ownerSigned}<span class="ok">Signed {date(l.ownerSignedAt)}</span>{:else}<span class="wait">Not signed</span>{/if}
            </li>
            {#if l.executingStaff}
              <li>
                <span>Executed by {l.executingStaff.code} · {l.executingStaff.name}</span>
                <span class="wait">{l.executedAt ? date(l.executedAt) : 'Pending'}</span>
              </li>
            {/if}
          </ul>
        </section>

        <section aria-labelledby="note-h">
          <h2 class="section-title" id="note-h">Notifications</h2>
          <LoadState loading={notes.loading} error={notes.error} retry={notes.reload} rows={3}>
            {#if (notes.data ?? []).length === 0}
              <p class="empty">No notifications yet.</p>
            {:else}
              <ul class="rule-list notes">
                {#each (notes.data ?? []).slice(0, 6) as n (n.id)}
                  <li>
                    <span class="n-date">{shortDate(n.createdAt)}</span>
                    <span class="n-text">{n.body}</span>
                    <span class="n-via">{n.channel}</span>
                  </li>
                {/each}
              </ul>
            {/if}
          </LoadState>
        </section>
      </div>
    </div>
  {/if}
</LoadState>

<style>
  .sign-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 24px;
  }

  .body {
    margin-top: 36px;
  }

  .section-head .btn {
    margin-bottom: 0;
  }

  .side {
    gap: 36px;
  }

  .ok {
    color: var(--moss-deep);
    font-weight: 600;
    white-space: nowrap;
  }

  .wait {
    color: var(--muted);
    white-space: nowrap;
  }

  .notes li {
    justify-content: flex-start;
    font-size: 13px;
  }

  .n-date {
    flex: none;
    width: 56px;
    color: var(--muted);
  }

  .n-text {
    flex: 1;
  }

  .n-via {
    flex: none;
    font-size: 12px;
    color: var(--muted);
  }
</style>
