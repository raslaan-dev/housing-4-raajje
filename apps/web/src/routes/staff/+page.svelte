<script lang="ts">
  import type { StaffOverview } from '@housing/shared';
  import { api } from '$lib/api';
  import { session } from '$lib/session.svelte';
  import { canSee, scoped, scopeParam } from '$lib/staff.svelte';
  import { branchLabel, mvr } from '$lib/format';
  import LoadState from '$lib/components/LoadState.svelte';

  const overview = scoped((branch) => api.get<StaffOverview>('/staff/overview', { branch }));
  const scopeName = $derived(scopeParam() === 'all' ? 'all branches' : branchLabel(session.user?.branch ?? overview.data?.branches[0]?.branch));
</script>

<svelte:head><title>Overview · Staff Portal</title></svelte:head>

<h1 class="page-title">Today</h1>
<p class="page-lede">Work waiting across {scopeName}.</p>

<LoadState loading={overview.loading && !overview.data} error={overview.error} retry={overview.reload} rows={6}>
  {#if overview.data}
    {@const q = overview.data.queues}
    <div class="figures">
      <div>
        <div class="figure-value">{q.pendingRegistrations}</div>
        <div class="figure-label">
          {#if canSee('queue')}<a href="/staff/queue">Registrations to verify</a>{:else}Registrations to verify{/if}
        </div>
      </div>
      <div>
        <div class="figure-value">{q.pendingApplications}</div>
        <div class="figure-label">
          {#if canSee('queue')}<a href="/staff/queue">Applications to verify</a>{:else}Applications to verify{/if}
        </div>
      </div>
      <div>
        <div class="figure-value">{q.viewingsToday}</div>
        <div class="figure-label">
          {#if canSee('viewings')}<a href="/staff/viewings">Viewings today</a>{:else}Viewings today{/if}
        </div>
      </div>
      <div>
        <div class="figure-value">{q.openMaintenance}</div>
        <div class="figure-label">Open maintenance requests</div>
      </div>
    </div>

    <section class="section" aria-labelledby="br-h">
      <h2 class="section-title" id="br-h">Branches</h2>
      <div class="scroll-x">
        <table class="ledger">
          <thead>
            <tr><th>Branch</th><th class="end">Listed units</th><th class="end">Occupancy</th><th class="end">Average rent</th></tr>
          </thead>
          <tbody>
            {#each overview.data.branches as b (b.branch.id)}
              <tr>
                <td class="strong">{branchLabel(b.branch)}</td>
                <td class="end">{b.properties}</td>
                <td class="end strong">{b.occupancy}%</td>
                <td class="end">{mvr(b.avgRent)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}
</LoadState>

