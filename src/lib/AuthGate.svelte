<script lang="ts">
  import { persistSession } from "./store";
  import { signIn } from "./supabase";

  let email = $state('');
  let password = $state('');
  let mode = $state<'signin' | 'signup'>('signin');
  let loading = $state(false);
  let error = $state('');

  async function submit() {
    loading = true; error = '';
    try {
      const s = await signIn(email, password);
      persistSession(s);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Erreur de connexion';
    } finally {
      loading = false;
    }
  }
</script>

<div class="auth-wrap">
  <div class="auth-card">
    <div class="auth-logo">FN<span class="x">X</span></div>
    <h1>FitNoobX</h1>
    <p class="caption">Connecte-toi pour accéder à ton suivi nutrition.</p>

    <form onsubmit={(e) => { e.preventDefault(); submit(); }}>
      <div class="field">
        <label class="label" for="email">Email</label>
        <input id="email" type="email" bind:value={email} autocomplete="email" placeholder="ton@email.fr" />
      </div>
      <div class="field">
        <label class="label" for="password">Mot de passe</label>
        <input id="password" type="password" bind:value={password} autocomplete="current-password" />
      </div>
      {#if error}<p class="auth-error">{error}</p>{/if}
      <button type="submit" class="btn-primary" disabled={loading}>
        {loading ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  </div>
</div>

<style>
.auth-wrap { flex:1; display:flex; align-items:center; justify-content:center; padding:24px; }
.auth-card { width:100%; display:flex; flex-direction:column; gap:6px; }
.auth-logo { width:52px; height:52px; border-radius:14px; background:var(--c-accent); color:var(--c-accent-fg); display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; letter-spacing:-0.5px; margin-bottom:8px; }
.x { opacity:0.7; }
h1 { font-size:28px; font-weight:600; letter-spacing:-0.5px; color:var(--c-text); }
.caption { font-size:14px; color:var(--c-text3); }
form { display:flex; flex-direction:column; gap:14px; margin-top:24px; }
.field { display:flex; flex-direction:column; gap:6px; }
.field label { font-size:12px; font-weight:500; color:var(--c-text3); text-transform:uppercase; letter-spacing:.05em; }
.field input { padding:12px 14px; border:1px solid var(--c-border); border-radius:var(--r-md); background:var(--c-surface); color:var(--c-text); font-size:15px; font-family:var(--font); }
.btn-primary { background:var(--c-accent); color:var(--c-accent-fg); border:none; border-radius:var(--r-md); padding:14px; font-size:15px; font-weight:600; cursor:pointer; margin-top:4px; font-family:var(--font); }
.btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
.auth-error { font-size:13px; color:var(--c-red, #e05); }
</style>
