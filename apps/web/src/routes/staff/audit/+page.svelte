<script lang="ts">
  import type { AuditEntry } from '@housing/shared';
  import { api } from '$lib/api';
  import { resource } from '$lib/resource.svelte';
  import { dateTime } from '$lib/format';
  import LoadState from '$lib/components/LoadState.svelte';

  const audit = resource(() => api.get<AuditEntry[]>('/staff/audit'));
</script>

<svelte:head><title>Audit log · Staff Portal</title></svelte:head>

<h1 class="page-title">Audit log</h1>
<p class="page-lede">Every record change, with the staff ID that made it.</p>

<div class="list">
  <LoadState loading={audit.loading} error={audit.error} retry={audit.reload} rows={8}>
    {#if !audit.data?.length}
      <p class="empty">Nothing logged yet.</p>
    {:else}
      <div class="scroll-x">
        <table class="ledger wide">
          <thead><tr><th>Time</th><th>Staff</th><th>Action</th><th>Branch</th></tr></thead>
          <tbody>
            {#each audit.data as a (a.id)}
              <tr>
                <td class="meta nowrap">{dateTime(a.createdAt)}</td>
                <td class="nowrap">{a.actor ? `${a.actor.code} ${a.actor.name}` : 'System'}</td>
                <td>{a.description}</td>
                <td class="meta">{a.branch}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </LoadState>
</div>

<style>
  .list {
    margin-top: 28px;
  }

  .wide {
    min-width: 760px;
  }

  .nowrap {
    white-space: nowrap;
  }
</style>
