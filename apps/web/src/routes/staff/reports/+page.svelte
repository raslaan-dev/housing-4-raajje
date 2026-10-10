<script lang="ts">
  import type { BranchReport } from '@housing/shared';
  import { api } from '$lib/api';
  import { scoped } from '$lib/staff.svelte';
  import { branchLabel, monthLong, mvrCompact, ROLE_LABEL } from '$lib/format';
  import LoadState from '$lib/components/LoadState.svelte';

  const report = scoped((branch) => api.get<BranchReport>('/staff/reports', { branch }));
</script>

<svelte:head><title>Branch reports · Staff Portal</title></svelte:head>

<LoadState loading={report.loading && !report.data} error={report.error} retry={report.reload} rows={8}>
  {#if report.data}
    {@const r = report.data}
    {@const scopeBranch = r.scope === 'all' ? null : r.occupancy.find((o) => o.branch.name === r.scope)?.branch}
    <h1 class="page-title">Branch reports</h1>
    <p class="page-lede">{monthLong(r.month)} {r.month.slice(0, 4)} · {branchLabel(scopeBranch)}</p>

    <div class="figures report-figures">
      <div><div class="figure-value">{r.figures.listedUnits}</div><div class="figure-label">Listed units</div></div>
      <div><div class="figure-value">{r.figures.occupancy}%</div><div class="figure-label">Occupancy</div></div>
      <div><div class="figure-value">{r.figures.viewings}</div><div class="figure-label">Viewings</div></div>
      <div><div class="figure-value">{r.figures.leasesExecuted}</div><div class="figure-label">Leases executed</div></div>
      <div><div class="figure-value">{mvrCompact(r.figures.rentCollected)}</div><div class="figure-label">Rent collected</div></div>
    </div>

    <div class="split body">
      <section aria-labelledby="occ-h">
        <h2 class="section-title" id="occ-h">Occupancy by branch</h2>
        <ul class="occ">
          {#each r.occupancy as o (o.branch.id)}
            <li>
              <div class="occ-row"><span>{branchLabel(o.branch)}</span><span class="num strong">{o.pct}%</span></div>
              <div class="meter"><span class:is-ink={scopeBranch?.id === o.branch.id} style="width: {o.pct}%"></span></div>
            </li>
          {/each}
        </ul>
      </section>

      <section aria-labelledby="perf-h">
        <h2 class="section-title" id="perf-h">Staff performance</h2>
        {#if r.staff.length === 0}
          <p class="empty">No staff activity recorded this month.</p>
        {:else}
          <div class="scroll-x">
            <table class="ledger">
              <thead><tr><th>Staff</th><th class="end"><abbr title="Registrations approved">Regs.</abbr></th><th class="end">Viewings</th><th class="end">Leases</th></tr></thead>
              <tbody>
                {#each r.staff as p (p.id)}
                  <tr>
                    <td>{p.name}<div class="cell-sub">{ROLE_LABEL[p.role]}</div></td>
                    <td class="end">{p.registrations}</td>
                    <td class="end">{p.viewings}</td>
                    <td class="end">{p.leases}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>
    </div>
    <button type="button" class="link export" onclick={() => window.print()}>Export report as PDF</button>
  {/if}
</LoadState>

<style>
  .report-figures {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 24px;
    margin-top: 36px;
    padding-bottom: 30px;
  }

  .report-figures .figure-value {
    font-size: 30px;
  }

  .export {
    display: inline-block;
    margin-top: 24px;
  }

  .body {
    margin-top: 34px;
  }

  .occ {
    display: flex;
    flex-direction: column;
    gap: 18px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .occ-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
  }

  abbr {
    text-decoration: none;
  }

  .strong {
    font-weight: 600;
  }

  @media print {
    .export {
      display: none;
    }
  }
</style>
