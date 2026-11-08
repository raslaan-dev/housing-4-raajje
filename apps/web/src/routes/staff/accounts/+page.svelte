<script lang="ts">
  import type { StaffAccount, StaffRole } from '@housing/shared';
  import { api } from '$lib/api';
  import { action } from '$lib/resource.svelte';
  import { scoped } from '$lib/staff.svelte';
  import { session } from '$lib/session.svelte';
  import { branchLabel, BRANCH_OPTIONS, ROLE_LABEL } from '$lib/format';
  import LoadState from '$lib/components/LoadState.svelte';

  const ROLES: StaffRole[] = ['PROPERTY_SPECIALIST', 'RECEPTIONIST', 'BRANCH_MANAGER', 'SYSTEM_ADMIN'];
  const accounts = scoped((branch) => api.get<StaffAccount[]>('/staff/accounts', { branch }));
  let f = $state({ name: '', role: ROLES[0] as StaffRole, branch: 'Male' });
  let touched = $state(false);
  let created = $state<StaffAccount | null>(null);
  const provision = action();
  const remove = action();
  let confirming = $state<string | null>(null);
  let removed = $state<{ account: StaffAccount; outcome: 'deleted' | 'deactivated' } | null>(null);

  async function onDelete(account: StaffAccount) {
    const result = await remove.run(() => api.delete<{ id: string; removed: 'deleted' | 'deactivated' }>(`/staff/accounts/${account.id}`));
    if (result) {
      accounts.set((accounts.data ?? []).filter((a) => a.id !== account.id));
      removed = { account, outcome: result.removed };
      if (created?.id === account.id) created = null;
    }
    confirming = null;
  }

  async function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    touched = true;
    removed = null;
    const [firstName = '', ...rest] = f.name.trim().split(/\s+/);
    const lastName = rest.join(' ');
    if (!firstName || !lastName) return;
    const account = await provision.run(() =>
      api.post<StaffAccount>('/staff/accounts', { firstName, lastName, role: f.role, branch: f.branch })
    );
    if (account) {
      created = account;
      remove.clear();
      accounts.set([...(accounts.data ?? []), account]);
      f.name = '';
      touched = false;
    }
  }
</script>

<svelte:head><title>Staff accounts · Staff Portal</title></svelte:head>

<h1 class="page-title">Staff accounts</h1>
<p class="page-lede">Only administrators can provision staff. Two-step verification is set up at first sign-in.</p>

<form class="sheet provision" onsubmit={onSubmit} novalidate>
  <label class="field name">Full name<input class="input" bind:value={f.name} placeholder="e.g. Fathimath Raya" aria-invalid={touched && f.name.trim().split(/\s+/).length < 2} /></label>
  <label class="field">
    Role
    <select class="input" bind:value={f.role}>
      {#each ROLES as r}<option value={r}>{ROLE_LABEL[r]}</option>{/each}
    </select>
  </label>
  <label class="field">
    Branch
    <select class="input" bind:value={f.branch}>
      {#each BRANCH_OPTIONS as b}<option value={b.value}>{b.label}</option>{/each}
    </select>
  </label>
  <button type="submit" class="btn btn-primary" disabled={provision.busy}>{provision.busy ? 'Provisioning…' : 'Provision account'}</button>
</form>
{#if touched && f.name.trim().split(/\s+/).length < 2}<p class="form-error" role="alert">Enter a first and last name.</p>{/if}
{#if provision.error}<p class="form-error" role="alert">{provision.error}</p>{/if}
{#if created}
  <p class="notice made" role="status">{created.code} {created.name} was created as {ROLE_LABEL[created.role]}. Sign-in email: {created.email}.</p>
{/if}
{#if remove.error}<p class="form-error" role="alert">{remove.error}</p>{/if}
{#if removed}
  <p class="notice made" role="status">
    {removed.account.code} {removed.account.name} was {removed.outcome === 'deleted' ? 'deleted' : 'removed. Their past activity stays in the audit log'}.
  </p>
{/if}

<div class="list">
  <LoadState loading={accounts.loading && !accounts.data} error={accounts.error} retry={accounts.reload} rows={6}>
    <div class="scroll-x">
      <table class="ledger wide">
        <thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Branch</th><th class="end">Two-step</th><th class="end"><span class="visually-hidden">Actions</span></th></tr></thead>
        <tbody>
          {#each accounts.data ?? [] as p (p.id)}
            <tr>
              <td class="meta">{p.code}</td>
              <td class="strong">{p.name}</td>
              <td>{ROLE_LABEL[p.role]}</td>
              <td class="meta">{branchLabel(p.branch)}</td>
              <td class="end">
                <span class="pill {p.mfaEnabled ? 'pill-sage' : 'pill-dashed'}">{p.mfaEnabled ? 'Enrolled' : 'Pending enrolment'}</span>
              </td>
              <td class="end actions">
                {#if p.id === session.user?.id}
                  <span class="meta">You</span>
                {:else if confirming === p.id}
                  <button type="button" class="btn btn-sm btn-primary" disabled={remove.busy} onclick={() => onDelete(p)}>
                    {remove.busy ? 'Deleting…' : 'Confirm delete'}
                  </button>
                  <button type="button" class="btn btn-sm btn-quiet" disabled={remove.busy} onclick={() => (confirming = null)}>Cancel</button>
                {:else}
                  <button type="button" class="btn btn-sm" aria-label="Delete {p.name}" onclick={() => { confirming = p.id; remove.clear(); }}>Delete</button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </LoadState>
</div>

<style>
  .provision {
    display: grid;
    grid-template-columns: minmax(0, 2fr) repeat(2, minmax(0, 1fr)) auto;
    gap: 14px;
    align-items: end;
    margin-top: 28px;
    padding: 22px 24px;
  }

  @media (max-width: 1100px) {
    .provision {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .provision .name {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 760px) {
    .provision {
      grid-template-columns: 1fr;
    }
  }

  .provision .btn {
    min-height: 42px;
  }

  .form-error,
  .made {
    margin-top: 12px;
  }

  .list {
    margin-top: 28px;
  }

  .wide {
    min-width: 820px;
  }

  .actions {
    white-space: nowrap;
  }

  .actions .btn + .btn {
    margin-left: 8px;
  }

  .strong {
    font-weight: 600;
  }
</style>
