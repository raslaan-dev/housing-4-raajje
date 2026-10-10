<script lang="ts">
  import type { OwnerOverview } from '@housing/shared';
  import { api } from '$lib/api';
  import { action, resource } from '$lib/resource.svelte';
  import LoadState from '$lib/components/LoadState.svelte';
  import Switch from '$lib/components/Switch.svelte';

  type Profile = OwnerOverview['profile'];
  const overview = resource(() => api.get<OwnerOverview>('/owner/overview'));
  let form = $state<Profile | null>(null);
  let saved = $state(false);
  const save = action();

  $effect(() => {
    if (overview.data && !form) form = { ...overview.data.profile };
  });

  async function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!form) return;
    saved = false;
    const updated = await save.run(() => api.patch<Profile>('/owner/profile', form));
    if (updated) {
      form = { ...updated };
      saved = true;
    }
  }
</script>

<svelte:head><title>Profile · Owner Portal</title></svelte:head>

<h1 class="page-title">Profile</h1>
<p class="page-lede">Your details are shared with branch staff only.</p>

<div class="body">
  <LoadState loading={overview.loading} error={overview.error} retry={overview.reload} rows={6}>
    {#if form}
      <form onsubmit={onSubmit} oninput={() => (saved = false)}>
        <div class="split">
          <div class="sheet stack">
            <h2 class="sheet-title">Personal details</h2>
            <div class="form-grid">
              <label class="field">First name<input class="input" bind:value={form.firstName} autocomplete="given-name" /></label>
              <label class="field">Last name<input class="input" bind:value={form.lastName} autocomplete="family-name" /></label>
            </div>
            <label class="field">National ID / Passport<input class="input" bind:value={form.nationalId} /></label>
            <label class="field">Phone<input class="input" type="tel" bind:value={form.phone} autocomplete="tel" /></label>
            <label class="field">Email<input class="input" type="email" bind:value={form.email} autocomplete="email" /></label>
          </div>

          <div class="stack side">
            <div class="sheet stack">
              <h2 class="sheet-title">Payout bank account</h2>
              <label class="field">
                Bank
                <select class="input" bind:value={form.bankName}>
                  <option>Bank of Maldives</option>
                  <option>Maldives Islamic Bank</option>
                  <option>SBI Maldives</option>
                </select>
              </label>
              <label class="field">Account number<input class="input num" bind:value={form.accountNumber} inputmode="numeric" /></label>
            </div>
            <div class="sheet mfa">
              <div>
                <div class="sheet-title">Two-step verification</div>
                <div class="hint">A code at every sign-in.</div>
              </div>
              <Switch bind:checked={form.mfaEnabled} label="Two-step verification" />
            </div>
          </div>
        </div>
        {#if save.error}<p class="form-error" role="alert">{save.error}</p>{/if}
        <div class="actions">
          <button type="submit" class="btn btn-primary" disabled={save.busy}>{save.busy ? 'Saving…' : 'Save changes'}</button>
          {#if saved}<span class="saved" role="status">Saved</span>{/if}
        </div>
      </form>
    {/if}
  </LoadState>
</div>

<style>
  .body {
    margin-top: 32px;
  }

  .side {
    gap: 24px;
  }

  .mfa {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding-block: 22px;
  }

  .hint {
    margin-top: 4px;
    font-size: 12.5px;
    color: var(--muted);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 24px;
  }

  .saved {
    font-size: 13px;
    font-weight: 600;
    color: var(--moss-deep);
  }
</style>
