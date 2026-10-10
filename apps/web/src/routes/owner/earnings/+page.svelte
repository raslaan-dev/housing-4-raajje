<script lang="ts">
  import type { OwnerOverview } from '@housing/shared';
  import { api } from '$lib/api';
  import { resource } from '$lib/resource.svelte';
  import { date, monthLabel, monthLong, monthShort, mvr, thousands } from '$lib/format';
  import LoadState from '$lib/components/LoadState.svelte';

  const overview = resource(() => api.get<OwnerOverview>('/owner/overview'));
</script>

<svelte:head><title>Earnings · Owner Portal</title></svelte:head>

<LoadState loading={overview.loading} error={overview.error} retry={overview.reload} rows={8}>
  {#if overview.data}
    {@const o = overview.data}
    {@const months = o.earnings.months}
    {@const shown = months.length > 1 && months[months.length - 1].gross === 0 ? months[months.length - 2] : months[months.length - 1]}
    {@const max = Math.max(1, ...months.map((m) => m.gross))}
    {@const outstanding = o.payments.filter((p) => p.status === 'OVERDUE').reduce((sum, p) => sum + p.amount, 0)}
    {@const ytd = months.reduce((sum, m) => sum + m.gross, 0)}
    {@const payments = o.payments.filter((p) => p.status !== 'PENDING').slice(0, 6)}
    <h1 class="page-title">Earnings</h1>
    <p class="page-lede">Rent collected through the branch office{shown ? `, ${monthLabel(shown.month).replace(/^\w+/, monthLong(shown.month))}` : ''}.</p>

    <div class="stats">
      <div>
        <div class="stat-value num">{mvr(shown?.gross ?? 0)}</div>
        <div class="stat-label">{shown && shown.month !== o.stats.month ? 'Collected last month' : 'Collected this month'}</div>
      </div>
      <div>
        <div class="stat-value num">{mvr(outstanding)}</div>
        <div class="stat-label">Outstanding</div>
      </div>
      <div>
        <div class="stat-value num is-moss">{mvr(ytd)}</div>
        <div class="stat-label">Year to date</div>
      </div>
    </div>

    <section class="block" aria-labelledby="chart-h">
      <h2 class="block-title chart-title" id="chart-h">Collected by month</h2>
      {#if months.length}
        <ol class="bars">
          {#each months as m, i (m.month)}
            <li>
              <span class="bar-month">{monthShort(m.month)}</span>
              <span class="bar" class:is-current={i === months.length - 1} style="height: {Math.max(2, (m.gross / max) * 100)}%"></span>
              <span class="bar-value num">{thousands(m.gross)}</span>
              <span class="visually-hidden">{monthLabel(m.month)}: {mvr(m.gross)}</span>
            </li>
          {/each}
        </ol>
      {:else}
        <p class="empty">No rent collected yet this year.</p>
      {/if}
    </section>

    <section class="block" aria-labelledby="pay-h">
      <h2 class="block-title" id="pay-h">Payments</h2>
      {#if payments.length === 0}
        <p class="empty">No payments yet.</p>
      {:else}
        <div class="scroll-x">
          <table class="ledger payments">
            <thead><tr><th>Date</th><th>Unit</th><th>Contract</th><th class="end">Amount</th></tr></thead>
            <tbody>
              {#each payments as p (p.id)}
                <tr>
                  <td class="meta">{date(p.date)}</td>
                  <td>{p.unitTitle}</td>
                  <td class="meta">{p.leaseReference}</td>
                  <td class="end strong" class:is-overdue={p.status === 'OVERDUE'}>{p.status === 'PAID' ? mvr(p.amount) : 'Overdue'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
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
    margin-top: 44px;
  }

  .block + .block {
    margin-top: 52px;
  }

  .block-title {
    margin: 0;
    font-size: 15px;
  }

  .chart-title {
    margin-bottom: 20px;
  }

  .bars {
    display: flex;
    align-items: flex-end;
    gap: clamp(6px, 2vw, 18px);
    height: 150px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .bars li {
    flex: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    gap: 9px;
  }

  .bar {
    width: 100%;
    max-width: 52px;
    border-radius: 5px 5px 0 0;
    background: var(--sage);
    transform-origin: bottom;
    animation: rise 0.6s var(--ease-out) both;
  }

  .bar.is-current {
    background: var(--ink);
  }

  @keyframes rise {
    from {
      transform: scaleY(0);
    }
  }

  .bar-month {
    font-size: 11px;
    color: var(--muted);
  }

  .bar-value {
    font-size: 11.5px;
    color: var(--ink-soft);
  }

  .payments {
    margin-top: 16px;
    min-width: 560px;
  }

  .strong {
    font-weight: 600;
  }

  .is-overdue {
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

    .bar-value {
      display: none;
    }
  }
</style>
