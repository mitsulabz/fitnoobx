<script lang="ts">
  import { appData, session, scheduleSync } from './store';
  import { refreshToken } from './supabase';
  import { persistSession } from './store';
  import FoodModal from './FoodModal.svelte';
  import { get } from 'svelte/store';
  import {
    num, calcBMR, calcTDEE, targetIntake, goalCalc,
    dayKcal, dayExpend, dstr, frDate, frShort, parseDS
  } from './calc';

  const BUILD = 'V2.1';
  const SUPABASE_URL = 'https://arydsxswhbgpfayjgtak.supabase.co';

  const today = new Date();
  const todayKey = dstr(today);
  const todayLabel = (() => {
    const WD = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
    const MO = ['jan','fév','mar','avr','mai','juin','juil','aoû','sep','oct','nov','déc'];
    return WD[today.getDay()] + ' ' + today.getDate() + ' ' + MO[today.getMonth()];
  })();

  // Food modal
  let showModal = $state(false);
  let modalDayKey = $state(todayKey);
  function openModal(key: string) { modalDayKey = key; showModal = true; }

  const data = $derived($appData as any ?? {});
  const profile = $derived(data.profile ?? {});
  const days = $derived(data.days ?? {});

  // Today
  const todayDay = $derived(days[todayKey] ?? { weight: '', act: profile.act || '1.30', sport: null, foods: [] });
  const todayKcal = $derived(dayKcal(todayDay));
  const todayTarget = $derived(targetIntake(profile));
  const todayReste = $derived(todayTarget - todayKcal);

  // Goal & progression
  const goal = $derived(goalCalc(profile));
  const allKeys = $derived(Object.keys(days).sort((a,b) => parseDS(a).getTime() - parseDS(b).getTime()));

  const cumDeficit = $derived(allKeys.reduce((s, k) => {
    const d = days[k];
    if (!d?.foods?.length && !d?.weight) return s;
    return s + dayExpend(d, profile) - dayKcal(d);
  }, 0));

  // Progression % vers l'objectif
  const progPct = $derived(goal && goal.kcalToLose > 0
    ? Math.max(0, Math.min(100, Math.round(cumDeficit / goal.kcalToLose * 100)))
    : 0);

  // Date d'atteinte de l'objectif
  const goalDateStr = $derived((() => {
    if (!goal || goal.rate <= 0) return '—';
    const remaining = goal.kcalToLose - cumDeficit;
    if (remaining <= 0) return 'Objectif atteint 🎉';
    const d = Math.round(remaining / goal.rate);
    return frShort(new Date(today.getTime() + d * 86400000));
  })());

  // Coach IA
  let coachLoading = $state(false);
  let coachResult = $state('');
  let coachError = $state('');
  let coachOpen = $state(false);

  async function runCoach() {
    const s = get(session);
    if (!s) return;
    coachLoading = true; coachResult = ''; coachError = ''; coachOpen = true;
    try {
      let tok = s.access_token;
      try { const fresh = await refreshToken(s.refresh_token); persistSession(fresh); tok = fresh.access_token; } catch {}
      const d = get(appData) as any;
      const p = d?.profile ?? {};
      const dys = d?.days ?? {};
      const keys = Object.keys(dys).sort().slice(-7);
      const dayLines = keys.map((k: string) => {
        const day = dys[k];
        const kcal = (day.foods ?? []).reduce((s: number, f: any) => s + (f.k||0), 0);
        return `${k}: ${Math.round(kcal)} kcal${day.weight ? ', poids '+day.weight+'kg' : ''}`;
      }).join('\n');
      const summary = `Profil: ${p.age}ans, ${p.sex==='h'?'homme':'femme'}, ${p.height}cm, ${p.weight}kg, ${p.bf}%MG objectif ${p.bft}%MG, act×${p.act}, ${p.sportHours}h sport/sem\nCible: ${todayTarget} kcal/j, déficit cible ${goal?.rate ?? 0} kcal/j\n\n7 derniers jours:\n${dayLines}`;
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

  // Recent days (last 7 always + older with data)
  // Premier jour effectivement saisi (plancher : on ne remonte pas avant)
  const firstLogged = $derived(allKeys.find(k => {
    const d = days[k];
    return d?.foods?.length || d?.weight || d?.sport;
  }));

  const recentDays = $derived((() => {
    const seen = new Set<string>();
    const result: string[] = [];
    const floor = firstLogged ? parseDS(firstLogged).getTime() : today.getTime();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (d.getTime() < floor) break; // pas avant le 1er jour saisi
      const k = dstr(d);
      seen.add(k);
      result.push(k);
    }
    const older = [...allKeys].reverse().filter(k => !seen.has(k));
    for (const k of older) {
      const day = days[k];
      if (day?.foods?.length || day?.weight || day?.sport) result.push(k);
      if (result.length >= 21) break;
    }
    return result;
  })());


  function save(newData: any) {
    const s = get(session);
    if (!s) return;
    appData.set(newData);
    scheduleSync(s, newData);
  }



  function removeFood(dk: string, idx: number) {
    const d = get(appData) as any;
    const day = getOrCreateDay(dk);
    const foods = [...(day.foods ?? [])];
    foods.splice(idx, 1);
    save({ ...d, days: { ...d.days, [dk]: { ...day, foods } } });
  }

  let weightTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  function onWeightInput(ds: string, val: string) {
    clearTimeout(weightTimers[ds]);
    weightTimers[ds] = setTimeout(() => updateDay(ds, { weight: val }), 600);
  }
</script>

<div class="scroll-area">
  <!-- Header -->
  <div class="header">
    <div class="header-date">{todayLabel} <span class="build">{BUILD}</span>
      <button class="reload-btn" onclick={() => location.reload()} aria-label="Recharger">↻</button>
    </div>
    <div class="header-title">FitNoob<span class="x">X</span></div>
  </div>

  <!-- Barre de progression objectif -->
  {#if goal}
    <div class="card prog-card">
      <div class="prog-top">
        <span class="prog-label">PROGRESSION OBJECTIF</span>
        <span class="prog-badge">{progPct}%</span>
      </div>
      <div class="prog-bg">
        <div class="prog-fill" style="width:{progPct}%"></div>
      </div>
      <div class="prog-sub">{Math.max(0, Math.round(cumDeficit)).toLocaleString('fr-FR')} sur {Math.round(goal.kcalToLose).toLocaleString('fr-FR')} kcal brûlées · objectif {profile.goalMode === 'bf' ? profile.bft + '% MG' : Math.round(goal.goalWeight) + ' kg'}</div>
    </div>
  {/if}

  <!-- Hero cards -->
  <div class="hero-row">
    <div class="card hero-card hero-eat">
      <div class="hero-label">À MANGER AUJOURD'HUI</div>
      <div class="hero-val">{todayTarget}<span class="hero-unit">kcal</span></div>
      <div class="hero-sub" class:over={todayReste < 0}>
        {todayReste < 0 ? 'Dépassé de ' + Math.abs(Math.round(todayReste)) + ' kcal' : 'Reste ' + Math.round(todayReste) + ' kcal'}
      </div>
    </div>
    <div class="card hero-card hero-goal">
      <div class="hero-label">DATE OBJECTIF</div>
      <div class="hero-goal-val">{goalDateStr}</div>
      {#if goal}<div class="hero-sub">à −{goal.rate} kcal/j</div>{/if}
    </div>
  </div>

  <!-- Bouton coach -->
  <button class="coach-btn card" onclick={runCoach} disabled={coachLoading}>
    🤖 <strong>{coachLoading ? 'Analyse en cours…' : 'Demander un bilan au coach'}</strong>
  </button>
  {#if coachOpen && (coachResult || coachError)}
    <div class="card coach-result">
      {#if coachResult}{coachResult}{/if}
      {#if coachError}<span class="coach-err">{coachError}</span>{/if}
    </div>
  {/if}

  <!-- Day cards -->
  {#each recentDays as ds}
    {@const day = days[ds] ?? { foods: [] }}
    {@const isToday = ds === todayKey}
    {@const kcal = dayKcal(day)}
    {@const target = todayTarget}

    <div class="day-card card" class:today={isToday}>
      <div class="day-header">
        <span class="day-date">{isToday ? 'Auj. ' : ''}{frDate(ds)}</span>
        <span class="day-kcal" class:over={kcal > target && kcal > 0}>
          {#if kcal > 0}{Math.round(kcal)} kcal{/if}
          {#if target > 0}<span class="day-target"> / {target}</span>{/if}
        </span>
      </div>

      {#if day.foods?.length}
        <div class="foods-list">
          {#each day.foods as food, i}
            <div class="food-item">
              <span class="food-name">{food.n}</span>
              <span class="food-kcal">{Math.round(food.k)} kcal</span>
              <button class="del-btn" onclick={() => removeFood(ds, i)}>×</button>
            </div>
          {/each}
        </div>
      {/if}

      <button class="add-food-btn" onclick={() => openModal(ds)}>+ Ajouter un aliment</button>
    </div>
  {/each}
  <div style="height:8px"></div>
</div>

{#if showModal}
  <FoodModal dayKey={modalDayKey} onclose={() => showModal = false} />
{/if}

<style>
  .header { padding:20px 0 12px; display:flex; align-items:baseline; justify-content:space-between; }
  .header-date { font-size:13px; color:var(--c-text3); }
  .build { font-size:11px; color:var(--c-text3); margin-left:4px; }
  .reload-btn { background:none; border:none; color:var(--c-text3); font-size:14px; line-height:1; padding:0 4px; margin-left:2px; cursor:pointer; vertical-align:middle; }
  .reload-btn:active { color:var(--c-accent); }
  .header-title { font-size:22px; font-weight:700; color:var(--c-text); letter-spacing:-0.5px; }
  .x { color:var(--c-accent); }

  /* Progression */
  .prog-card { margin-bottom:8px; display:flex; flex-direction:column; gap:8px; }
  .prog-top { display:flex; align-items:center; justify-content:space-between; }
  .prog-label { font-size:11px; font-weight:600; letter-spacing:.07em; color:var(--c-text3); text-transform:uppercase; }
  .prog-badge { background:var(--c-accent); color:var(--c-accent-fg); font-size:12px; font-weight:700; padding:3px 9px; border-radius:20px; }
  .prog-bg { height:6px; background:var(--c-surface2); border-radius:3px; overflow:hidden; }
  .prog-fill { height:100%; background:var(--c-accent); border-radius:3px; transition:width .4s; }
  .prog-sub { font-size:12px; color:var(--c-text3); }

  /* Coach */
  .coach-btn { width:100%; padding:16px; border:2px solid var(--c-accent); border-radius:var(--r-md); background:transparent; color:var(--c-accent); font-size:15px; cursor:pointer; font-family:var(--font); margin-bottom:8px; text-align:center; }
  .coach-btn:disabled { opacity:.6; cursor:not-allowed; }
  .coach-result { font-size:13px; line-height:1.6; color:var(--c-text); white-space:pre-wrap; margin-bottom:8px; }
  .coach-err { color:#e05; }

  /* Hero */
  .hero-row { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px; }
  .hero-card { display:flex; flex-direction:column; gap:4px; }
  .hero-label { font-size:10px; font-weight:600; letter-spacing:.07em; color:var(--c-text3); text-transform:uppercase; }
  .hero-val { font-size:32px; font-weight:700; color:var(--c-text); line-height:1; }
  .hero-unit { font-size:14px; font-weight:400; color:var(--c-text2); margin-left:2px; }
  .hero-goal-val { font-size:16px; font-weight:700; color:var(--c-text); line-height:1.2; margin-top:4px; }
  .hero-sub { font-size:12px; color:var(--c-accent); font-weight:500; }
  .hero-sub.over { color:#e05; }

  /* Day cards */
  .day-card { margin-bottom:10px; display:flex; flex-direction:column; gap:0; padding:0; overflow:hidden; }
  .day-card.today { border-color:var(--c-accent); }
  .day-header { display:flex; align-items:center; justify-content:space-between; padding:14px 16px 12px; }
  .day-date { font-size:15px; font-weight:600; color:var(--c-text); }
  .day-kcal { font-size:15px; font-weight:700; color:var(--c-text); }
  .day-kcal.over { color:#e05; }
  .day-target { font-size:13px; font-weight:400; color:var(--c-text3); }

  .foods-list { display:flex; flex-direction:column; }
  .food-item { display:flex; align-items:center; gap:8px; padding:10px 16px; border-top:0.5px solid var(--c-border); }
  .food-name { flex:1; font-size:14px; color:var(--c-text); }
  .food-kcal { font-size:14px; color:var(--c-text2); flex-shrink:0; }
  .del-btn { border:none; background:none; color:var(--c-text3); font-size:18px; cursor:pointer; padding:0 2px; line-height:1; flex-shrink:0; }

  .add-food-btn { width:100%; padding:14px 16px; border:none; border-top:1px dashed var(--c-border); background:transparent; color:var(--c-accent); font-size:14px; font-weight:600; cursor:pointer; font-family:var(--font); text-align:center; border-radius:0; }

  /* Fonds pastel — mode clair uniquement */
  :global(html[data-theme='light']) .prog-card { background:#FFE98A; border-color:rgba(0,0,0,0.05); }
  :global(html[data-theme='light']) .coach-btn { background:#FFC2DF; border-color:#FFC2DF; color:#1a1a1a; }
  :global(html[data-theme='light']) .hero-eat { background:#79E8B3; border-color:rgba(0,0,0,0.05); }
  :global(html[data-theme='light']) .hero-goal { background:#BBEFFF; border-color:rgba(0,0,0,0.05); }

  /* Texte noir sur cellules colorées (clair) */
  :global(html[data-theme='light']) .prog-card .prog-label,
  :global(html[data-theme='light']) .prog-card .prog-sub,
  :global(html[data-theme='light']) .hero-eat .hero-label,
  :global(html[data-theme='light']) .hero-eat .hero-val,
  :global(html[data-theme='light']) .hero-eat .hero-unit,
  :global(html[data-theme='light']) .hero-eat .hero-sub,
  :global(html[data-theme='light']) .hero-goal .hero-label,
  :global(html[data-theme='light']) .hero-goal .hero-goal-val,
  :global(html[data-theme='light']) .hero-goal .hero-sub { color:#1a1a1a; }
</style>
