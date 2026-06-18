<script lang="ts">
  import { t, persistSession } from "./store";
  import { signIn } from "./supabase";

  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state('');

  async function signin() {
    loading = true; error = '';
    try {
      const s = await signIn(email, password);
      persistSession(s);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : $t.auth.error;
    } finally {
      loading = false;
    }
  }
</script>

<div class="auth-wrap">
  <div class="auth-card">
    <div class="auth-logo">FP</div>
    <h1>{$t.auth.title}</h1>
    <p class="caption">{$t.auth.subtitle}</p>

    <form onsubmit={(e) => { e.preventDefault(); signin(); }}>
      <div class="field">
        <label class="label" for="email">{$t.auth.email}</label>
        <input id="email" type="text" bind:value={email} autocomplete="email" />
      </div>
      <div class="field">
        <label class="label" for="password">{$t.auth.password}</label>
        <input id="password" type="password" bind:value={password} autocomplete="current-password" />
      </div>
      {#if error}<p class="auth-error">{error}</p>{/if}
      <button type="submit" class="btn-primary" disabled={loading}>
        {loading ? $t.auth.signing_in : $t.auth.signin}
      </button>
    </form>
  </div>
</div>

<style>
.auth-wrap { flex:1; display:flex; align-items:center; justify-content:center; padding:24px; }
.auth-card { width:100%; display:flex; flex-direction:column; gap:6px; }
.auth-logo { width:52px; height:52px; border-radius:14px; background:var(--c-accent); color:var(--c-accent-fg); display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; letter-spacing:-0.5px; margin-bottom:8px; }
h1 { font-size:28px; font-weight:600; letter-spacing:-0.5px; color:var(--c-text); }
form { display:flex; flex-direction:column; gap:14px; margin-top:24px; }
.field { display:flex; flex-direction:column; gap:6px; }
.btn-primary { background:var(--c-accent); color:var(--c-accent-fg); border:none; border-radius:var(--r-md); padding:14px; font-size:15px; font-weight:600; cursor:pointer; transition:opacity 0.15s; margin-top:4px; font-family:var(--font); }
.btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
.auth-error { font-size:13px; color:var(--c-red); }
</style>
