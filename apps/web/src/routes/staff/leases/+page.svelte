<script lang="ts">
  import type { CreateLeaseBody, StaffLease, StaffOptions } from '@housing/shared';
  import { api } from '$lib/api';
  import { action } from '$lib/resource.svelte';
  import { session } from '$lib/session.svelte';
  import { scoped } from '$lib/staff.svelte';
  import { date, mvr, termLabel } from '$lib/format';

  const leases = scoped((branch) => api.get<StaffLease[]>('/staff/leases', { branch }));
  const options = scoped((branch) => api.get<StaffOptions>('/staff/options', { branch }));

  const METHODS: CreateLeaseBody['paymentMethod'][] = ['Bank deposit', 'Online transfer', 'Cash at branch'];
  const nextMonth = (() => {
    const d = new Date();
    const n = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`;
  })();

  let f = $state({ propertyId: '', clientId: '', rent: '', deposit: '', startDate: nextMonth, termMonths: '12', paymentMethod: METHODS[0] });
  let created = $state<StaffLease | null>(null);
  const create = action();

  const available = $derived((options.data?.properties ?? []).filter((p) => p.status === 'AVAILABLE'));
  const num = (v: string) => Number(String(v).replace(/\D/g, '')) || 0;

  $effect(() => {
    if (options.data && !f.clientId) f.clientId = options.data.clients[0]?.id ?? '';
    if (available.length && !available.some((p) => p.id === f.propertyId)) {
      f.propertyId = available[0].id;
      f.rent = available[0].monthlyRent.toLocaleString('en-US');
    }
  });

  function onProperty() {
    const p = available.find((x) => x.id === f.propertyId);
    if (p) f.rent = p.monthlyRent.toLocaleString('en-US');
  }

  const timeline = $derived.by(() => {
    const start = new Date(f.startDate || nextMonth);
    const end = new Date(start.getFullYear(), start.getMonth() + Number(f.termMonths), start.getDate() - 1);
    const reminder = new Date(end.getFullYear(), end.getMonth() - 2, end.getDate());
    return { start, end, reminder };
  });

  const current = $derived(created ? (leases.data?.find((l) => l.id === created?.id) ?? created) : null);
  const clientCode = $derived(current?.client.code ?? options.data?.clients.find((c) => c.id === f.clientId)?.code ?? '—');
  const propertyTitle = $derived(current?.property.title ?? available.find((p) => p.id === f.propertyId)?.title ?? '—');
  const signState = (signed: boolean | undefined) => (signed ? 'Signed' : current ? 'Signature requested' : 'Requested on generation');

  const ready = $derived(!!f.propertyId && !!f.clientId && num(f.rent) > 0 && !!f.startDate);

  async function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!ready) return;
    const body: CreateLeaseBody = {
      propertyId: f.propertyId,
      clientId: f.clientId,
      monthlyRent: num(f.rent),
      securityDeposit: num(f.deposit),
      startDate: f.startDate,
      termMonths: Number(f.termMonths),
      paymentMethod: f.paymentMethod
    };
    const lease = await create.run(() => api.post<StaffLease>('/staff/leases', body));
    if (lease) {
      created = lease;
      setTimeout(() => leases.reload(), 0);
      leases.set([lease, ...(leases.data ?? [])]);
      options.reload();
    }
  }
</script>

<svelte:head><title>Lease execution · Staff Portal</title></svelte:head>

<h1 class="page-title">Lease execution</h1>
<p class="page-lede">Finalise payment terms and collect digital signatures from both parties.</p>

<form class="split body" onsubmit={onSubmit} oninput={() => (created = null)} onchange={() => (created = null)}>
  <div class="sheet form-grid">
    <label class="field span-all">
      Property
      <select class="input" bind:value={f.propertyId} onchange={onProperty} disabled={!available.length}>
        {#each available as p (p.id)}<option value={p.id}>{p.title}</option>{/each}
      </select>
      {#if options.data && !available.length}<span class="form-error">No available units in this branch.</span>{/if}
    </label>
    <label class="field span-all">
      Client
      <select class="input" bind:value={f.clientId}>
        {#each options.data?.clients ?? [] as c (c.id)}<option value={c.id}>{c.code} · {c.name}</option>{/each}
      </select>
    </label>
    <label class="field">Monthly rent (MVR)<input class="input num" bind:value={f.rent} inputmode="numeric" /></label>
    <label class="field">Advance / deposit (MVR)<input class="input num" bind:value={f.deposit} inputmode="numeric" placeholder="e.g. 9,000" /></label>
    <label class="field">Rent start date<input class="input" type="date" bind:value={f.startDate} /></label>
    <label class="field">
      Term
      <select class="input" bind:value={f.termMonths}>
        {#each ['6', '12', '24', '36', '60'] as t}<option value={t}>{termLabel(Number(t))}</option>{/each}
      </select>
    </label>
    <fieldset class="span-all methods">
      <legend>Payment method</legend>
      <div class="chips">
        {#each METHODS as m}
          <button type="button" class="chip" aria-pressed={f.paymentMethod === m} onclick={() => (f.paymentMethod = m)}>{m}</button>
        {/each}
      </div>
    </fieldset>
  </div>

  <div class="stack side">
    <div class="sheet">
      <h2 class="sheet-title">Lease timeline</h2>
      <dl class="kv tl">
        <div><dt>Rent starts</dt><dd>{date(timeline.start.toISOString())}</dd></div>
        <div><dt>Expires</dt><dd class="strong">{date(timeline.end.toISOString())}</dd></div>
        <div><dt>Renewal reminder</dt><dd>{date(timeline.reminder.toISOString())} (SMS + email)</dd></div>
        <div><dt>Due at signing</dt><dd class="num">{mvr(num(f.rent) + num(f.deposit))} · {f.paymentMethod}</dd></div>
        <div><dt>Executing staff</dt><dd>{session.user?.code} · {session.user?.name}</dd></div>
      </dl>
    </div>

    <div class="sheet">
      <h2 class="sheet-title">Digital sign-offs</h2>
      <ul class="rule-list signs">
        <li>
          <span>Client · {clientCode}</span>
          <span class="sign-state" data-signed={current?.clientSigned}>{signState(current?.clientSigned)}</span>
        </li>
        <li>
          <span>Owner of {propertyTitle}</span>
          <span class="sign-state" data-signed={current?.ownerSigned}>{signState(current?.ownerSigned)}</span>
        </li>
      </ul>
      {#if create.error}<p class="form-error" role="alert">{create.error}</p>{/if}
      <button type="submit" class="btn btn-primary btn-block send" disabled={!ready || create.busy || !!created}>
        {create.busy ? 'Generating…' : 'Generate contract'}
      </button>
      {#if created}
        <p class="notice done" role="status">
          Contract {created.reference} generated and logged under {session.user?.code}. Client and owner notified by SMS and email to sign.
        </p>
      {/if}
    </div>
  </div>
</form>

<style>
  .body {
    margin-top: 30px;
  }

  .methods {
    margin: 0;
    padding: 0;
    border: none;
  }

  .methods legend {
    margin-bottom: 8px;
    padding: 0;
    font-size: 12px;
    color: var(--muted);
  }

  .side {
    gap: 24px;
  }

  .tl {
    margin: 16px 0 0;
  }

  .strong {
    font-weight: 600;
  }

  .send {
    margin-top: 20px;
  }

  .signs {
    margin-top: 8px;
  }

  .sign-state {
    font-size: 12.5px;
    color: var(--muted);
    white-space: nowrap;
  }

  .sign-state[data-signed='true'] {
    color: var(--moss-deep);
    font-weight: 600;
  }

  .done {
    margin-top: 14px;
  }

</style>
