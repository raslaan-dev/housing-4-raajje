<script lang="ts">
  import type { DemoAccount, RegisterBody, SessionUser } from '@housing/shared';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { tick } from 'svelte';
  import { api } from '$lib/api';
  import { action } from '$lib/resource.svelte';
  import { signIn, PORTAL_FOR_ROLE } from '$lib/session.svelte';
  import { ROLE_LABEL } from '$lib/format';
  import Switch from '$lib/components/Switch.svelte';

  type Who = 'client' | 'owner' | 'staff';
  const ROLES: { key: Who; label: string }[] = [
    { key: 'client', label: 'Client' },
    { key: 'owner', label: 'Owner' },
    { key: 'staff', label: 'Staff' }
  ];

  const params = page.url.searchParams;
  const initial = params.get('role');
  let who = $state<Who>(initial === 'owner' || initial === 'staff' ? initial : 'client');
  let mode = $state<'signin' | 'register'>(params.get('mode') === 'register' ? 'register' : 'signin');
  let step = $state<'form' | 'mfa'>('form');
  const listIntent = params.get('intent') === 'list';
  const next = params.get('next');

  let email = $state('');
  let reg = $state({ firstName: '', lastName: '', email: '', phone: '', nationalId: '', sex: 'Female', dateOfBirth: '', maxRent: '' });
  let useMfa = $state(true);
  let pending = $state<SessionUser | null>(null);
  let code = $state(['', '', '', '', '', '']);
  let codeInputs: HTMLInputElement[] = [];

  let accounts = $state<DemoAccount[]>([]);
  api
    .get<DemoAccount[]>('/auth/demo-accounts')
    .then((a) => (accounts = a))
    .catch(() => (accounts = []));

  const submit = action();
  const isStaff = $derived(who === 'staff');
  const registering = $derived(mode === 'register' && !isStaff);
  const roleAccounts = $derived(
    accounts.filter((a) => (who === 'client' ? a.role === 'CLIENT' : who === 'owner' ? a.role === 'OWNER' : !['CLIENT', 'OWNER'].includes(a.role)))
  );

  const title = $derived(registering ? `Create ${who} account` : `Sign in as ${who}`);
  const subtitle = $derived(
    isStaff
      ? 'Internal operations for branch staff, managers and administrators.'
      : who === 'owner'
        ? registering
          ? 'List furnished apartments and track rental income.'
          : 'Manage your listings, leases and payouts.'
        : registering
          ? 'Search verified apartments and apply online.'
          : 'Search apartments, manage your lease and payments.'
  );

  function pickRole(key: Who) {
    who = key;
    if (key === 'staff') mode = 'signin';
    submit.clear();
  }

  function destination(user: SessionUser) {
    if (next && next.startsWith(PORTAL_FOR_ROLE[user.role])) return next;
    if (listIntent && user.role === 'OWNER') return '/owner/properties?register=1';
    return PORTAL_FOR_ROLE[user.role];
  }

  async function finish(user: SessionUser) {
    signIn(user);
    if (registering && useMfa) {
      await api.patch(user.role === 'OWNER' ? '/owner/profile' : '/client/profile', { mfaEnabled: true }).catch(() => undefined);
    }
    await goto(destination(user));
  }

  async function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    const user = await submit.run(async () => {
      if (registering) {
        const body: RegisterBody = {
          role: who === 'owner' ? 'OWNER' : 'CLIENT',
          firstName: reg.firstName.trim(),
          lastName: reg.lastName.trim(),
          email: reg.email.trim(),
          phone: reg.phone.trim(),
          ...(who === 'owner'
            ? { nationalId: reg.nationalId.trim() }
            : {
                sex: reg.sex as 'Female' | 'Male',
                dateOfBirth: reg.dateOfBirth || undefined,
                maxRent: Number(reg.maxRent.replace(/\D/g, '')) || undefined
              })
        };
        const { user } = await api.post<{ user: SessionUser }>('/auth/register', body);
        return { ...user, mfaEnabled: useMfa };
      }
      const { user } = await api.post<{ user: SessionUser }>('/auth/demo-login', { email: email.trim() });
      const expected = who === 'client' ? ['CLIENT'] : who === 'owner' ? ['OWNER'] : Object.keys(ROLE_LABEL).filter((r) => r !== 'CLIENT' && r !== 'OWNER');
      if (!expected.includes(user.role)) {
        throw new Error(`That account is a ${ROLE_LABEL[user.role].toLowerCase()} account. Choose the ${ROLE_LABEL[user.role].split(' ')[0]} tab to sign in with it.`);
      }
      return user;
    });
    if (!user) return;
    if (isStaff || user.mfaEnabled) {
      pending = user;
      step = 'mfa';
      await tick();
      codeInputs[0]?.focus();
    } else {
      await finish(user);
    }
  }

  function onCodeInput(i: number, e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    if (digits.length > 1) {
      digits
        .slice(0, 6 - i)
        .split('')
        .forEach((d, j) => (code[i + j] = d));
      codeInputs[Math.min(i + digits.length, 5)]?.focus();
      return;
    }
    code[i] = digits;
    if (digits && i < 5) codeInputs[i + 1]?.focus();
  }

  function onCodeKey(i: number, e: KeyboardEvent) {
    if (e.key === 'Backspace' && !code[i] && i > 0) codeInputs[i - 1]?.focus();
  }

  const codeComplete = $derived(code.every((d) => d.length === 1));
  let codeError = $state<string | null>(null);

  async function verify(e: SubmitEvent) {
    e.preventDefault();
    if (!codeComplete) {
      codeError = 'Enter all six digits of the code.';
      return;
    }
    codeError = null;
    if (pending) await finish({ ...pending, mfaEnabled: true });
  }
</script>

<svelte:head>
  <title>{step === 'mfa' ? 'Verification code' : title} · Housing_4_Raajje</title>
</svelte:head>

<div class="split-screen">
  <aside class="brand">
    <a class="wordmark" href="/">Housing_4_Raajje</a>
    <div>
      <h1>Verified rentals across three islands.</h1>
      <p>One account for owners listing apartments, clients looking for a home, and the staff who connect them.</p>
    </div>
    <dl class="branches">
      <div><dt>Branch 1</dt><dd>Malé</dd></div>
      <div><dt>Branch 2</dt><dd>Hulhumalé</dd></div>
      <div><dt>Branch 3</dt><dd>Villingili</dd></div>
    </dl>
  </aside>

  <main class="form-side">
    <div class="form-col">
      {#if step === 'form'}
        <div class="segmented" role="tablist" aria-label="Account type">
          {#each ROLES as r}
            <button type="button" role="tab" aria-selected={who === r.key} onclick={() => pickRole(r.key)}>{r.label}</button>
          {/each}
        </div>

        {#if listIntent && who === 'owner'}
          <p class="notice intent">
            To list an apartment, sign in or create an owner account. You'll enter the apartment details next, and branch staff
            verify it before it goes live.
          </p>
        {/if}

        <h2 class="form-title">{title}</h2>
        <p class="form-sub">{subtitle}</p>

        <form class="stack fields" onsubmit={onSubmit} novalidate>
          {#if !registering}
            <label class="field">
              Email
              <input class="input on-paper" type="email" bind:value={email} placeholder="you@example.mv" autocomplete="username" required />
            </label>
            {#if roleAccounts.length}
              <div class="dev">
                <p>
                  Development mode: Clerk is not configured, so seeded accounts sign in by email without a password. Pick one:
                </p>
                <div class="chips">
                  {#each roleAccounts as a (a.id)}
                    <button type="button" class="chip" aria-pressed={email === a.email} onclick={() => (email = a.email)}>
                      {a.name}{isStaff ? ` · ${ROLE_LABEL[a.role]}` : ''}
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
          {:else}
            <div class="pair">
              <label class="field">First name<input class="input on-paper" bind:value={reg.firstName} autocomplete="given-name" required /></label>
              <label class="field">Last name<input class="input on-paper" bind:value={reg.lastName} autocomplete="family-name" required /></label>
            </div>
            {#if who === 'owner'}
              <label class="field">
                National ID / Passport no.
                <input class="input on-paper" bind:value={reg.nationalId} placeholder="A123456" required />
              </label>
            {:else}
              <div class="pair">
                <label class="field">
                  Sex
                  <select class="input on-paper" bind:value={reg.sex}><option>Female</option><option>Male</option></select>
                </label>
                <label class="field">Date of birth<input class="input on-paper" type="date" bind:value={reg.dateOfBirth} /></label>
              </div>
              <label class="field">
                Maximum monthly rent (MVR)
                <input class="input on-paper" inputmode="numeric" bind:value={reg.maxRent} placeholder="15,000" />
              </label>
            {/if}
            <div class="pair">
              <label class="field">Phone<input class="input on-paper" type="tel" bind:value={reg.phone} placeholder="7xx xxxx" autocomplete="tel" required /></label>
              <label class="field">Email<input class="input on-paper" type="email" bind:value={reg.email} placeholder="you@example.mv" autocomplete="email" required /></label>
            </div>
          {/if}

          {#if registering}
            <div class="mfa-opt">
              <Switch bind:checked={useMfa} label="Use two-step verification" />
              <span>Use two-step verification (recommended)</span>
            </div>
          {/if}
          {#if isStaff}
            <p class="notice small">Two-step verification is required for staff. Staff accounts are created by the System Administrator.</p>
          {/if}

          {#if submit.error}<p class="form-error" role="alert">{submit.error}</p>{/if}

          <button type="submit" class="btn btn-primary btn-block" disabled={submit.busy}>
            {submit.busy ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}
          </button>

          {#if !isStaff}
            <button
              type="button"
              class="switch-mode"
              onclick={() => {
                mode = registering ? 'signin' : 'register';
                submit.clear();
              }}
            >
              {registering ? 'Already have an account? Sign in' : 'New here? Create an account'}
            </button>
          {/if}
        </form>
      {:else}
        <h2 class="form-title">Enter verification code</h2>
        <p class="form-sub">
          A 6-digit code goes to the phone on your account. Development mode: Clerk is not configured, so any six digits are
          accepted.
        </p>
        <form onsubmit={verify} novalidate>
          <div class="code" role="group" aria-label="Verification code">
            {#each code as digit, i}
              <input
                bind:this={codeInputs[i]}
                value={digit}
                oninput={(e) => onCodeInput(i, e)}
                onkeydown={(e) => onCodeKey(i, e)}
                inputmode="numeric"
                autocomplete={i === 0 ? 'one-time-code' : 'off'}
                maxlength={6}
                aria-label="Digit {i + 1}"
              />
            {/each}
          </div>
          {#if codeError}<p class="form-error" role="alert">{codeError}</p>{/if}
          <button type="submit" class="btn btn-primary btn-block verify">Verify and continue</button>
          <div class="code-foot">
            <button
              type="button"
              class="btn-quiet btn"
              onclick={() => {
                step = 'form';
                code = ['', '', '', '', '', ''];
              }}>Back</button
            >
          </div>
        </form>
      {/if}
    </div>
  </main>
</div>

<style>
  .split-screen {
    display: flex;
    flex-wrap: wrap;
    min-height: 100vh;
  }

  .brand {
    flex: 1 1 380px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 48px;
    padding: 56px 64px;
    background: var(--ink);
    color: var(--paper);
  }

  .wordmark {
    font-family: var(--font-display);
    font-size: 17px;
    font-weight: 600;
    color: var(--paper);
  }

  .wordmark:hover {
    color: var(--sage);
  }

  .brand h1 {
    max-width: 13ch;
    font-size: clamp(36px, 4.4vw, 52px);
    letter-spacing: -0.025em;
    line-height: 1.08;
  }

  .brand p {
    margin-top: 20px;
    max-width: 42ch;
    font-size: 15px;
    line-height: 1.6;
    color: rgba(247, 246, 242, 0.78);
  }

  .branches {
    display: flex;
    flex-wrap: wrap;
    gap: 16px 40px;
    margin: 0;
    font-size: 13px;
  }

  .branches dt {
    color: var(--sage);
  }

  .branches dd {
    margin: 2px 0 0;
    font-size: 15px;
  }

  .form-side {
    flex: 1.2 1 400px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 56px 40px;
  }

  .form-col {
    width: 100%;
    max-width: 440px;
  }

  .segmented {
    display: flex;
    gap: 4px;
    padding: 4px;
    border-radius: 10px;
    background: rgba(21, 65, 83, 0.07);
  }

  .segmented button {
    flex: 1;
    min-height: 40px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--muted);
    font-size: 13.5px;
    transition:
      background-color 0.15s ease,
      color 0.15s ease;
  }

  .segmented button:hover {
    color: var(--ink);
  }

  .segmented button[aria-selected='true'] {
    background: var(--sheet);
    color: var(--ink);
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(21, 65, 83, 0.14);
  }

  .intent {
    margin-top: 24px;
  }

  .form-title {
    margin-top: 36px;
    font-size: 28px;
    letter-spacing: -0.02em;
  }

  .form-sub {
    margin-top: 8px;
    font-size: 13.5px;
    line-height: 1.55;
    color: var(--muted);
  }

  .fields {
    margin-top: 28px;
  }

  .pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .dev {
    padding: 14px 16px;
    border: 1px dashed rgba(21, 65, 83, 0.3);
    border-radius: 10px;
    font-size: 12.5px;
    line-height: 1.55;
    color: var(--muted);
  }

  .dev .chips {
    margin-top: 10px;
  }

  .mfa-opt {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
    color: var(--ink-soft);
  }

  .notice.small {
    font-size: 12.5px;
  }

  .switch-mode {
    align-self: center;
    border: none;
    background: none;
    padding: 4px 0;
    color: var(--moss-deep);
    font-size: 13px;
    font-weight: 600;
  }

  .switch-mode:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .code {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 10px;
    margin-top: 30px;
  }

  .code input {
    width: 100%;
    height: 58px;
    border: 1px solid rgba(21, 65, 83, 0.25);
    border-radius: 10px;
    background: var(--sheet);
    text-align: center;
    font-family: var(--font-display);
    font-size: 22px;
    color: var(--ink);
  }

  .code input:focus {
    outline: none;
    border-color: var(--ink);
    box-shadow: 0 0 0 3px rgba(113, 146, 110, 0.25);
  }

  .code + .form-error {
    margin-top: 12px;
  }

  .verify {
    margin-top: 26px;
  }

  .code-foot {
    margin-top: 12px;
  }

  @media (max-width: 760px) {
    .brand {
      flex-basis: 100%;
      gap: 28px;
      padding: 28px 16px 32px;
    }

    .branches {
      display: none;
    }

    .form-side {
      padding: 32px 16px 56px;
    }

    .pair {
      grid-template-columns: 1fr;
    }
  }
</style>
