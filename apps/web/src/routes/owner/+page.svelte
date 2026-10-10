<script lang="ts">
  import type { OwnerOverview } from '@housing/shared';
  import { api } from '$lib/api';
  import { resource } from '$lib/resource.svelte';
  import { date, fullAddress, mvr } from '$lib/format';
  import LoadState from '$lib/components/LoadState.svelte';
  import Pill from '$lib/components/Pill.svelte';
  import SignaturePrompt from '$lib/components/SignaturePrompt.svelte';

  const overview = resource(() => api.get<OwnerOverview>('/owner/overview'));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

  function citiesLine(cities: string[]) {
    const unique = [...new Set(cities)];
    return unique.length <= 1 ? unique.join('') : `${unique.slice(0, -1).join(', ')} and ${unique[unique.length - 1]}`;
  }
</script>

<svelte:head><title>Dashboard · Owner Portal</title></svelte:head>

<LoadState loading={overview.loading} error={overview.error} retry={overview.reload} rows={8}>
  {#if overview.data}
    {@const o = overview.data}
    {@const live = o.units.filter((u) => u.approvalStatus === 'APPROVED')}
    {@const months = o.earnings.months}
    {@const shown = months.length > 1 && months[months.length - 1].gross === 0 ? months[months.length - 2] : months[months.length - 1]}
    {@const payments = o.payments.filter((p) => p.status !== 'PENDING').slice(0, 4)}
    <h1 class="page-title">{greeting}, {o.profile.firstName}</h1>
    <p class="page-lede">
      {NUMBER_WORDS[live.length] ?? live.length}
      {live.length === 1 ? 'unit' : 'units'}{live.length ? ` across ${citiesLine(live.map((u) => u.city))}` : ''}.
    </p>

    <SignaturePrompt overview={o} onsigned={overview.set} />

    <div class="stats">
      <div>
        <div class="stat-value num">{mvr(shown?.gross ?? 0)}</div>
        <div class="stat-label">{shown && shown.month !== o.stats.month ? 'Collected last month' : 'Collected this month'}</div>
      </div>
      <div>
        <div class="stat-value num is-moss">{o.stats.available}</div>
        <div class="stat-label">{o.stats.available === 1 ? 'Unit' : 'Units'} available</div>
      </div>
      <div>
        <div class="stat-value num">{o.stats.overdue}</div>
        <div class="stat-label">{o.stats.overdue === 1 ? 'Payment' : 'Payments'} overdue</div>
      </div>
    </div>

    <section class="block" aria-labelledby="units-h">
      <h2 class="block-title" id="units-h">Your units</h2>
      {#if o.units.length === 0}
        <p class="empty">No units yet. <a class="link" href="/owner/properties?register=1">Register an apartment</a></p>
      {:else}
        <ul class="rows">
          {#each o.units as u (u.id)}
            <li class="unit">
              <div class="u-main">
                <div class="u-name">{u.title}</div>
                <div class="u-address">{fullAddress(u)}</div>
              </div>
              <div class="u-rent num">{mvr(u.monthlyRent)}</div>
              <div class="u-status">
                <Pill
                  status={u.approvalStatus === 'PENDING' ? 'PENDING_APPROVAL' : u.status}
                  label={u.approvalStatus === 'PENDING' ? 'Pending verification' : undefined}
                />
              </div>
            </li>
          {/each}
        </ul>
        <a class="after-link" href="/owner/availability">Manage availability</a>
      {/if}
    </section>

    <section class="block" aria-labelledby="pay-h">
      <h2 class="block-title" id="pay-h">Recent rent payments</h2>
      {#if payments.length === 0}
        <p class="empty">No rent has been collected yet.</p>
      {:else}
        <ul class="rows">
          {#each payments as p (p.id)}
            <li class="payment">
              <div class="p-date">{date(p.date)}</div>
              <div class="p-unit">{p.unitTitle} <span class="p-ref">· {p.leaseReference}</span></div>
              <div class="p-amount num" class:is-paid={p.status === 'PAID'}>{p.status === 'PAID' ? `+ ${mvr(p.amount)}` : 'Overdue'}</div>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}
</LoadState>

<style>
  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 24px 64px;
    margin-top: 44px;
    padding-bottom: 34px;
    border-bottom: 1px solid var(--line);
  }

  .stat-value {
    font-family: var(--font-display);
    font-size: 34px;
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.1;
    white-space: nowrap;
  }

  .stat-value.is-moss {
    color: var(--moss);
  }

  .stat-label {
    margin-top: 5px;
    font-size: 12.5px;
    color: var(--muted);
  }

  .block {
    margin-top: 40px;
  }

  .block + .block {
    margin-top: 48px;
  }

  .block-title {
    margin: 0 0 4px;
    font-size: 15px;
  }

  .rows {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .unit {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 18px 0;
    border-bottom: 1px solid var(--line-soft);
  }

  .u-main {
    flex: 1;
    min-width: 0;
  }

  .u-name {
    font-size: 14.5px;
    font-weight: 600;
  }

  .u-address {
    margin-top: 4px;
    font-size: 12.5px;
    color: var(--muted);
  }

  .u-rent {
    flex: none;
    width: 150px;
    text-align: right;
    font-size: 13.5px;
    color: var(--ink-soft);
  }

  .u-status {
    flex: none;
    width: 170px;
    text-align: right;
  }

  .after-link {
    display: inline-block;
    margin-top: 18px;
    font-size: 13px;
    font-weight: 600;
    color: var(--moss-deep);
  }

  .after-link:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .payment {
    display: flex;
    align-items: baseline;
    gap: 20px;
    padding: 15px 0;
    border-bottom: 1px solid var(--line-soft);
  }

  .p-date {
    flex: none;
    width: 110px;
    font-size: 12.5px;
    color: var(--muted);
  }

  .p-unit {
    flex: 1;
    min-width: 0;
    font-size: 13.5px;
  }

  .p-ref {
    font-size: 12.5px;
    color: var(--muted);
  }

  .p-amount {
    flex: none;
    font-size: 13.5px;
    font-weight: 600;
  }

  .p-amount.is-paid {
    color: var(--moss-deep);
  }

  @media (max-width: 640px) {
    .stats {
      gap: 20px 40px;
      margin-top: 32px;
    }

    .stat-value {
      font-size: 28px;
    }

    .unit {
      flex-wrap: wrap;
      gap: 6px 16px;
    }

    .u-main {
      flex-basis: 100%;
    }

    .u-rent,
    .u-status {
      width: auto;
    }

    .u-rent {
      text-align: left;
    }

    .u-status {
      margin-left: auto;
    }

    .payment {
      flex-wrap: wrap;
      gap: 4px 16px;
    }

    .p-date {
      width: auto;
    }

    .p-unit {
      flex-basis: 100%;
      order: 3;
    }

    .p-amount {
      margin-left: auto;
    }
  }
</style>
