<script lang="ts">
  import type { ClientMe, ClientProfile } from '@housing/shared';
  import { api } from '$lib/api';
  import { action, resource } from '$lib/resource.svelte';
  import { BRANCH_OPTIONS } from '$lib/format';
  import LoadState from '$lib/components/LoadState.svelte';
  import Switch from '$lib/components/Switch.svelte';

  const me = resource(() => api.get<ClientMe>('/client/me'));
  let form = $state<ClientProfile | null>(null);
  let maxRentText = $state('');
  let fullName = $state('');
  let saved = $state(false);

  $effect(() => {
    if (me.data && !form) {
      form = { ...me.data.profile };
      fullName = [form.firstName, form.lastName].filter(Boolean).join(' ');
      maxRentText = me.data.profile.maxRent ? me.data.profile.maxRent.toLocaleString('en-US') : '';
    }
  });

  const save = action();

  async function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!form) return;
    saved = false;
    const [firstName = '', ...rest] = fullName.trim().split(/\s+/);
    const body: Partial<ClientProfile> = { ...form, firstName, lastName: rest.join(' '), maxRent:Number(maxRentText.replace(/\D/g, '')) || null };
    const updated = await save.run(() => api.patch<ClientProfile>('/client/profile', body));
    if (updated) {
      form = { ...updated };
      saved = true;
    }
  }
</script>

<svelte:head><title>Profile · Client Portal</title></svelte:head>

<h1 class="page-title">Profile</h1>
<p class="page-lede">Your preferences are used to match you with new listings.</p>

<div class="body">
  <LoadState loading={me.loading} error={me.error} retry={me.reload} rows={6}>
    {#if form}
      <form onsubmit={onSubmit} oninput={() => (saved = false)}>
        <div class="split">
          <fieldset class="sheet form-grid">
            <legend class="sheet-title span-all">Personal details</legend>
            <label class="field span-all">Full name<input class="input" bind:value={fullName} autocomplete="name" /></label>
            <label class="field">
              Sex
              <select class="input" bind:value={form.sex}><option>Female</option><option>Male</option></select>
            </label>
            <label class="field">Date of birth<input class="input" type="date" bind:value={form.dateOfBirth} /></label>
            <label class="field">Phone<input class="input" type="tel" bind:value={form.phone} autocomplete="tel" /></label>
            <label class="field">Email<input class="input" type="email" bind:value={form.email} autocomplete="email" /></label>
          </fieldset>

          <div class="stack side">
            <fieldset class="sheet stack">
              <legend class="sheet-title">Rental preferences</legend>
              <label class="field">
                Maximum monthly rent (MVR)
                <input class="input" inputmode="numeric" bind:value={maxRentText} />
              </label>
              <label class="field">
                Preferred location
                <select class="input" bind:value={form.preferredLocation}>
                  {#each BRANCH_OPTIONS as b}<option value={b.value}>{b.label.split(' · ')[1]}</option>{/each}
                </select>
              </label>
            </fieldset>

            <div class="sheet mfa">
              <div>
                <div class="sheet-title">Two-step verification</div>
                <div class="hint">Optional. Recommended to protect your data.</div>
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

  fieldset {
    margin: 0;
    min-width: 0;
  }

  legend.sheet-title {
    float: left;
    width: 100%;
    margin-bottom: 4px;
    padding: 0;
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
