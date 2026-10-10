<script lang="ts">
  import type { OwnerOverview } from '@housing/shared';
  import { api } from '$lib/api';
  import { action } from '$lib/resource.svelte';
  import { date, mvr, termLabel } from '$lib/format';

  let { overview, onsigned }: { overview: OwnerOverview; onsigned: (o: OwnerOverview) => void } = $props();
  const sign = action();

  async function signLease(id: string) {
    const updated = await sign.run(() => api.post<OwnerOverview>(`/owner/leases/${id}/sign`));
    if (updated) onsigned(updated);
  }
</script>

{#each overview.pendingSignatures as s (s.leaseId)}
  <div class="notice prompt">
    <span>
      <strong>Lease {s.reference} needs your signature.</strong>
      {s.unitTitle} to client {s.clientCode} · {mvr(s.monthlyRent)} a month for {termLabel(s.termMonths)}, from {date(s.startDate)}.
    </span>
    <button type="button" class="btn btn-primary btn-sm" onclick={() => signLease(s.leaseId)} disabled={sign.busy}>
      {sign.busy ? 'Signing…' : 'Sign lease'}
    </button>
  </div>
{/each}
{#if sign.error}<p class="form-error" role="alert">{sign.error}</p>{/if}

<style>
  .prompt {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 24px;
  }
</style>
