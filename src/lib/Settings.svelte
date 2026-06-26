<script lang="ts">
  import { theme, appData, session, scheduleSync, syncNow, persistSession } from './store';
  import { refreshToken, saveAppState } from './supabase';
  import { get } from 'svelte/store';
  import { ACT_LEVELS, calcBMR, calcTDEE, targetIntake, deficitFor } from './calc';

  const SUPABASE_URL = 'https://arydsxswhbgpfayjgtak.supabase.co';

  function toggleTheme() { theme.update(v => v === 'dark' ? 'light' : 'dark'); }

  const data = $derived($appData as any ?? {});
  const profile = $derived(data.profile ?? {});

  // Profile form state
  let fAge = $state('');
  let fSex = $state('h');
  let fHeight = $state('');
  let fWeight = $state('');
  let fBf = $state('');
  let fBft = $state('');
  let fAct = $state('1.30');
  let fSportH = $state('');
  let fGoalMode = $state('weight');
  let fGoalWeight = $state('');
  let profileLoaded = $state(false);

  $effect(() => {
    const p = ($appData as any)?.profile;
    if (p && !profileLoaded) {
      fAge = p.age ? String(p.age) : '';
      fSex = p.sex || 'h';
      fHeight = p.height ? String(p.height) : '';
      fWeight = p.weight ? String(p.weight) : '';
      fBf = p.bf ? String(p.bf) : '';
      fBft = p.bft ? String(p.bft) : '';
      fAct = p.act || '1.30';
      fSportH = p.sportHours ? String(p.sportHours) : '';
      fGoalMode = p.goalMode || 'weight';
      fGoalWeight = p.goalWeight ? String(p.goalWeight) : '';
      profileLoaded = true;
    }
  });

  function saveProfile() {
    const s = get(session);
    const d = get(appData) as any;
    if (!s || !d) return;
    const newProfile = {
      age: parseFloat(fAge) || 0,
      sex: fSex,
      height: parseFloat(fHeight) || 0,
      weight: parseFloat(fWeight) || 0,
      bf: parseFloat(fBf) || 0,
      bft: parseFloat(fBft) || 0,
      act: fAct,
      sportHours: parseFloat(fSportH) || 0,
      goalMode: 'bf',
      goalWeight: parseFloat(fGoalWeight) || 0,
    };
    const newData = { ...d, profile: newProfile };
    appData.set(newData);
    syncNow(s, newData);
    profileSaved = true;
    setTimeout(() => profileSaved = false, 2000);
  }

  let profileSaved = $state(false);

  // KPIs
  const bmr = $derived(calcBMR(profile));
  const tdee = $derived(calcTDEE(profile));
  const cible = $derived(targetIntake(profile));
  const deficit = $derived(tdee ? deficitFor(profile, tdee) : 0);

  // Coach IA
  let coachLoading = $state(false);
  let coachResult = $state('');
  let coachError = $state('');

  async function runCoach() {
    const s = get(session);
    if (!s) return;
    coachLoading = true; coachResult = ''; coachError = '';
    try {
      let tok = s.access_token;
      try { const fresh = await refreshToken(s.refresh_token); persistSession(fresh); tok = fresh.access_token; } catch {}
      const d = get(appData) as any;
      const summary = buildSummary(d);
      const r = await fetch(`${SUPABASE_URL}/functions/v1/coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
        body: JSON.stringify({ summary }),
      });
      const j = await r.json();
      if (j.result) coachResult = j.result;
      else coachError = j.error ?? JSON.stringify(j);
    } catch (e: any) { coachError = e.message ?? 'Erreur réseau'; }
    coachLoading = false;
  }

  function buildSummary(d: any): string {
    const p = d?.profile ?? {};
    const days = d?.days ?? {};
    const keys = Object.keys(days).sort().slice(-7);
    const dayLines = keys.map((k: string) => {
      const day = days[k];
      const kcal = (day.foods ?? []).reduce((s: number, f: any) => s + (f.k||0), 0);
      return `${k}: ${Math.round(kcal)} kcal${day.weight ? ', poids '+day.weight+'kg' : ''}`;
    }).join('\n');
    return `Profil: ${p.age}ans, ${p.sex==='h'?'homme':'femme'}, ${p.height}cm, ${p.weight}kg, ${p.bf}%MG, act×${p.act}, ${p.sportHours}h sport/sem\n\n7 derniers jours:\n${dayLines}`;
  }

  // Export / Import
  function exportData() {
    const d = $appData;
    if (!d) return;
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `fitnoobx-${new Date().toLocaleDateString('fr-FR').replace(/\//g,'-')}.json`;
    a.click(); URL.revokeObjectURL(url);
  }

  let fileInput: HTMLInputElement;
  let importStatus = $state('');

  async function onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    importStatus = 'Lecture…';
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const s = get(session);
      if (!s) { importStatus = 'Non connecté'; return; }
      const newData = json.profile ? json : (json.fitnoobx ?? json);
      importStatus = 'Sauvegarde…';
      appData.set(newData);
      syncNow(s, newData);
      importStatus = '✓ Importé';
      profileLoaded = false; // force re-read profile form
      setTimeout(() => importStatus = '', 3000);
    } catch { importStatus = 'Fichier invalide'; }
    fileInput.value = '';
  }

  function signout() { persistSession(null); appData.set(null); }
</script>

<div class="scroll-area">
  <div class="sheader">
    <div class="stitle">Réglages</div>
    <div class="ssubtitle">{$session?.user?.email ?? ''}</div>
  </div>

  <!-- Profil -->
  <div class="section-title">Mon profil</div>
  <div class="card profile-form">
    <div class="field-row">
      <div class="field">
        <label>Âge</label>
        <input type="number" min="10" max="100" placeholder="43" bind:value={fAge} />
      </div>
      <div class="field">
        <label>Sexe</label>
        <select bind:value={fSex}>
          <option value="h">Homme</option>
          <option value="f">Femme</option>
        </select>
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>Taille (cm)</label>
        <input type="number" min="100" max="250" placeholder="180" bind:value={fHeight} />
      </div>
      <div class="field">
        <label>Poids (kg)</label>
        <input type="number" min="30" max="300" step="0.1" placeholder="85" bind:value={fWeight} />
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>% Masse grasse</label>
        <input type="number" min="0" max="60" step="0.1" placeholder="25" bind:value={fBf} />
      </div>
      <div class="field">
        <label>% Objectif MG</label>
        <input type="number" min="5" max="50" step="0.1" placeholder="20" bind:value={fBft} />
      </div>
    </div>
    <div class="field">
      <label>Niveau d'activité quotidienne</label>
      <select bind:value={fAct}>
        {#each ACT_LEVELS as lvl}
          <option value={lvl.key}>{lvl.label} — {lvl.desc}</option>
        {/each}
      </select>
    </div>
    <div class="field">
      <label>Heures sport / sem.</label>
      <input type="number" min="0" max="30" step="0.5" placeholder="3" bind:value={fSportH} />
    </div>
    <button class="btn-accent" onclick={saveProfile}>
      {profileSaved ? '✓ Enregistré' : 'Enregistrer le profil'}
    </button>
  </div>

  <!-- KPI -->
  {#if bmr}
    <div class="section-title">Mes chiffres</div>
    <div class="card kpi-card">
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-v">{bmr}</div><div class="kpi-l">Métabolisme de base</div></div>
        <div class="kpi"><div class="kpi-v">{tdee}</div><div class="kpi-l">Dépense estimée</div></div>
        <div class="kpi"><div class="kpi-v">{deficit}</div><div class="kpi-l">Déficit conseillé</div></div>
        <div class="kpi"><div class="kpi-v kpi-accent">{cible}</div><div class="kpi-l">Cible / jour</div></div>
      </div>
      <div class="kpi-note">{profile.bf ? 'BMR via Katch-McArdle (masse maigre).' : 'BMR via Mifflin-St-Jeor. Renseigne ton % MG pour plus de précision.'}</div>
    </div>
  {/if}



  <!-- Apparence -->
  <div class="section-title">Apparence</div>
  <div class="section">
    <button class="card setting-row" onclick={toggleTheme}>
      <span class="body">Thème</span>
      <div class="pill">{$theme === 'dark' ? 'Sombre' : 'Clair'}</div>
    </button>
  </div>

  <!-- Données -->
  <div class="section-title">Données</div>
  <div class="section">
    <button class="card setting-row" onclick={exportData}>
      <span class="body">Exporter (JSON)</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    </button>
    <button class="card setting-row" onclick={() => fileInput.click()}>
      <span class="body">Importer (JSON FitNoob / FitNoobX)</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="transform:scaleY(-1)"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    </button>
    <input bind:this={fileInput} type="file" accept=".json" onchange={onFileChange} style="display:none" />
    {#if importStatus}<div class="import-status" class:success={importStatus.startsWith('✓')}>{importStatus}</div>{/if}
  </div>

  <!-- Compte -->
  <div class="section-title">Compte</div>
  <div class="section">
    <button class="card setting-row danger-btn" onclick={signout}>
      <span class="body">Se déconnecter</span>
    </button>
  </div>

  <div class="version">FitNoobX · V3.4</div>
</div>

<style>
  .sheader { padding:20px 0 14px; }
  .stitle { font-size:22px; font-weight:700; color:var(--c-text); }
  .ssubtitle { font-size:12px; color:var(--c-text3); margin-top:2px; }
  .section-title { font-size:11px; font-weight:500; text-transform:uppercase; letter-spacing:.06em; color:var(--c-text3); margin:20px 0 8px; }
  .section { display:flex; flex-direction:column; gap:8px; }

  /* Profile form */
  .profile-form { display:flex; flex-direction:column; gap:12px; }
  .field-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .field { display:flex; flex-direction:column; gap:4px; }
  .field label { font-size:11px; font-weight:500; color:var(--c-text3); text-transform:uppercase; letter-spacing:.05em; }
  .field input, .field select { padding:9px 10px; border:1px solid var(--c-border); border-radius:var(--r-md); background:var(--c-surface); color:var(--c-text); font-size:14px; font-family:var(--font); }
  .field select { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; padding-right:28px; }
  .btn-accent { width:100%; padding:12px; border:none; border-radius:var(--r-md); background:var(--c-accent); color:var(--c-accent-fg); font-size:14px; font-weight:600; cursor:pointer; font-family:var(--font); }

  /* KPI */
  .kpi-card { }
  .kpi-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; margin-bottom:10px; }
  .kpi { text-align:center; }
  .kpi-v { font-size:20px; font-weight:700; color:var(--c-text); }
  .kpi-v.kpi-accent { color:var(--c-accent); }
  .kpi-l { font-size:10px; color:var(--c-text3); margin-top:2px; }
  .kpi-note { font-size:11px; color:var(--c-text3); line-height:1.4; }

  /* Settings rows */
  .setting-row { display:flex; align-items:center; justify-content:space-between; cursor:pointer; width:100%; text-align:left; font-family:var(--font); color:var(--c-text); gap:10px; }
  .pill { background:var(--c-surface2); border:0.5px solid var(--c-border2); border-radius:20px; padding:4px 12px; font-size:12px; font-weight:500; color:var(--c-text2); flex-shrink:0; }
  .caption { font-size:12px; color:var(--c-text3); }
  .del-btn { border:none; background:none; color:var(--c-text3); font-size:18px; cursor:pointer; padding:0 4px; }

  .btn-accent-sm { width:36px; height:36px; border:none; border-radius:50%; background:var(--c-accent); color:var(--c-accent-fg); font-size:20px; font-weight:300; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }

  /* Coach */
  .coach-result { white-space:pre-wrap; font-size:13px; line-height:1.6; color:var(--c-text); }
  .coach-error { font-size:13px; color:#e05; padding:8px 12px; background:rgba(220,50,50,.08); border-radius:8px; }

  /* Import/Export */
  .import-status { font-size:13px; color:var(--c-text2); padding:8px 4px; }
  .import-status.success { color:var(--c-accent); }

  /* Account */
  .danger-btn { color:#e05; }

  .version { text-align:center; margin-top:32px; padding-bottom:8px; color:var(--c-text3); font-size:12px; }
</style>
