<script lang="ts">
  import { appData, session, scheduleSync, syncNow } from './store';
  import { refreshToken, persistSession } from './supabase';
  import FoodModal from './FoodModal.svelte';
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import {
    ACT_LEVELS, num, calcBMR, calcTDEE, targetIntake, goalCalc,
    dayKcal, dayExpend, dstr, frDate, frShort, parseDS, deficitFor
  } from './calc';

  const BUILD = 'V1.0';

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

  // Today's data
  const todayDay = $derived(days[todayKey] ?? { weight: '', act: profile.act || '1.30', sport: null, foods: [] });
  const todayKcal = $derived(dayKcal(todayDay));
  const todayTarget = $derived(targetIntake(profile));
  const todayExpend = $derived(dayExpend(todayDay, profile));
  const todayDeficit = $derived(todayExpend - todayKcal);
  const todayReste = $derived(todayTarget - todayKcal);

  // Goal projection
  const goal = $derived(goalCalc(profile));
  const allKeys = $derived(Object.keys(days).sort((a,b) => parseDS(a).getTime() - parseDS(b).getTime()));
  const cumDeficit = $derived(allKeys.reduce((s, k) => {
    const d = days[k];
    if (!d?.foods?.length && !d?.weight) return s;
    return s + dayExpend(d, profile) - dayKcal(d);
  }, 0));

  function goalDate(rate: number): string {
    if (!goal || rate <= 0) return '—';
    const remaining = goal.kcalToLose - cumDeficit;
    if (remaining <= 0) return 'Objectif atteint 🎉';
    const days = remaining / rate;
    return frShort(new Date(today.getTime() + days * 86400000));
  }

  // Recent days for history (last 14 with data + today)
  const recentDays = $derived((() => {
    const result: string[] = [todayKey];
    const past = [...allKeys].reverse().filter(k => k !== todayKey).slice(0, 30);
    for (const k of past) {
      const d = days[k];
      if (d?.foods?.length || d?.weight || d?.sport) result.push(k);
      if (result.length >= 15) break;
    }
    return result;
  })());

  // Macro sums for a day
  function macros(day: any) {
    const foods = day?.foods ?? [];
    const p = foods.reduce((s: number, f: any) => s + num(f.p), 0);
    const g = foods.reduce((s: number, f: any) => s + num(f.g), 0);
    const l = foods.reduce((s: number, f: any) => s + num(f.l), 0);
    const pc = p * 4, gc = g * 4, lc = l * 9, t = (pc + gc + lc) || 1;
    return { p, g, l, pc, gc, lc, t };
  }

  function save(newData: any) {
    const s = get(session);
    if (!s) return;
    appData.set(newData);
    scheduleSync(s, newData);
  }

  function getOrCreateDay(ds: string) {
    const d = get(appData) as any;
    const existing = d?.days?.[ds] ?? {};
    return { weight: '', act: profile.act || '1.30', sport: null, foods: [], ...existing };
  }

  function updateDay(ds: string, patch: Record<string, unknown>) {
    const d = get(appData) as any;
    const day = getOrCreateDay(ds);
    const updated = { ...day, ...patch };
    save({ ...d, days: { ...d.days, [ds]: updated } });
  }

  function removeFood(dayKey: string, idx: number) {
    const d = get(appData) as any;
    const day = getOrCreateDay(dayKey);
    const foods = [...(day.foods ?? [])];
    foods.splice(idx, 1);
    save({ ...d, days: { ...d.days, [dayKey]: { ...day, foods } } });
  }

  // Objectif panel
  let goalOpen = $state(false);

  // Weight input debounce
  let weightTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  function onWeightInput(ds: string, val: string) {
    clearTimeout(weightTimers[ds]);
    weightTimers[ds] = setTimeout(() => updateDay(ds, { weight: val }), 600);
  }

  // Sport kcal input
  let sportTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  function onSportInput(ds: string, kcal: string) {
    clearTimeout(sportTimers[ds]);
    sportTimers[ds] = setTimeout(() => {
      const d = get(appData) as any;
      const day = getOrCreateDay(ds);
      const sport = kcal ? { name: 'Sport', kcal: parseInt(kcal) || 0 } : null;
      save({ ...d, days: { ...d.days, [ds]: { ...day, sport } } });
    }, 600);
  }
</script>

<div class="scroll-area">
  <!-- Header -->
  <div class="header">
    <div class="header-date">{todayLabel} <span class="build">{BUILD}</span></div>
    <div class="header-title">FitNoob<span class="x">X</span></div>
  </div>

  <!-- Objectif panel -->
  {#if goal}
    <button class="goal-card card" onclick={() => goalOpen = !goalOpen}>
      <div class="goal-row">
        <div class="goal-main">
          <span class="goal-label">Objectif</span>
          <span class="goal-weight">{Math.round(goal.goalWeight)} kg</span>
        </div>
        <div class="goal-dates">
          <div class="goal-date-item">
            <span class="goal-date-label">🚶 Zen</span>
            <span class="goal-date-val">{goalDate(goal.rate)}</span>
          </div>
          <div class="goal-date-item">
            <span class="goal-date-label">🔥 Max</span>
            <span class="goal-date-val">{goalDate(goal.rate * 1.5)}</span>
          </div>
        </div>
        <svg class="chevron" class:open={goalOpen} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      {#if goalOpen}
        <div class="goal-detail">
          <div class="kpi-row">
            <div class="kpi"><div class="kpi-v">{calcBMR(profile) || '—'}</div><div class="kpi-l">Métabolisme</div></div>
            <div class="kpi"><div class="kpi-v">{calcTDEE(profile) || '—'}</div><div class="kpi-l">Dépense est.</div></div>
            <div class="kpi"><div class="kpi-v">{todayTarget || '—'}</div><div class="kpi-l">Cible / jour</div></div>
            <div class="kpi"><div class="kpi-v">{Math.round(cumDeficit)}</div><div class="kpi-l">Déficit total</div></div>
          </div>
          <div class="goal-note">{profile.bf ? 'BMR via Katch-McArdle.' : 'BMR via Mifflin-St-Jeor. Renseigne ton % de masse grasse pour plus de précision.'}</div>
        </div>
      {/if}
    </button>
  {/if}

  <!-- Day cards -->
  {#each recentDays as ds}
    {@const day = days[ds] ?? { weight: '', act: profile.act || '1.30', sport: null, foods: [] }}
    {@const isToday = ds === todayKey}
    {@const kcal = dayKcal(day)}
    {@const expend = dayExpend(day, profile)}
    {@const target = todayTarget}
    {@const reste = target - kcal}
    {@const m = macros(day)}
    {@const pct = target > 0 ? Math.min(100, Math.round(kcal / target * 100)) : 0}

    <div class="day-card card" class:today={isToday}>
      <!-- Card header -->
      <div class="day-header">
        <div class="day-label">
          {#if isToday}<span class="today-badge">Aujourd'hui</span>{/if}
          <span class="day-date">{frDate(ds)}</span>
        </div>
        <div class="weight-field">
          <input
            type="number" placeholder="— kg" step="0.1" min="30" max="300"
            value={day.weight || ''}
            oninput={(e) => onWeightInput(ds, (e.target as HTMLInputElement).value)}
          />
          <span class="weight-unit">kg</span>
        </div>
      </div>

      <!-- Activity selector -->
      <select
        class="act-select"
        value={day.act || profile.act || '1.30'}
        onchange={(e) => updateDay(ds, { act: (e.target as HTMLSelectElement).value })}
      >
        {#each ACT_LEVELS as lvl}
          <option value={lvl.key}>{lvl.label}</option>
        {/each}
      </select>

      <!-- Calorie summary -->
      <div class="cal-summary">
        <div class="cal-item">
          <span class="cal-val">{target}</span>
          <span class="cal-label">cible</span>
        </div>
        <div class="cal-sep">·</div>
        <div class="cal-item">
          <span class="cal-val">{Math.round(kcal)}</span>
          <span class="cal-label">mangé</span>
        </div>
        <div class="cal-sep">·</div>
        <div class="cal-item" class:over={reste < 0}>
          <span class="cal-val">{reste < 0 ? '+' + Math.abs(Math.round(reste)) : Math.round(reste)}</span>
          <span class="cal-label">{reste < 0 ? 'dépassé' : 'reste'}</span>
        </div>
      </div>

      <!-- Progress bar -->
      {#if target > 0}
        <div class="progress-bg">
          <div class="progress-fill" style="width:{pct}%" class:over={pct >= 100}></div>
        </div>
      {/if}

      <!-- Macro bar -->
      {#if kcal > 0}
        <div class="macro-bar-wrap">
          <div class="macro-bar">
            <div class="mb-p" style="width:{m.pc/m.t*100}%"></div>
            <div class="mb-g" style="width:{m.gc/m.t*100}%"></div>
            <div class="mb-l" style="width:{m.lc/m.t*100}%"></div>
          </div>
          <div class="macro-legend">
            <span><span class="dot p"></span>P {round1(m.p)}g</span>
            <span><span class="dot g"></span>G {round1(m.g)}g</span>
            <span><span class="dot l"></span>L {round1(m.l)}g</span>
          </div>
        </div>
      {/if}

      <!-- Foods list -->
      {#if day.foods?.length}
        <div class="foods-list">
          {#each day.foods as food, i}
            <div class="food-item">
              <span class="food-name">{food.n}</span>
              <span class="food-kcal">{Math.round(food.k)} kcal</span>
              <button class="del-btn" onclick={() => removeFood(ds, i)} aria-label="Supprimer">×</button>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Sport extra -->
      <div class="sport-row">
        <span class="sport-icon">🏃</span>
        <input
          type="number" placeholder="Sport extra (kcal)" min="0" max="5000" step="10"
          value={day.sport?.kcal || ''}
          oninput={(e) => onSportInput(ds, (e.target as HTMLInputElement).value)}
          class="sport-input"
        />
        {#if day.sport?.kcal}
          <span class="sport-badge">+{day.sport.kcal} kcal brûlés</span>
        {/if}
      </div>

      <!-- Add food button -->
      <button class="add-food-btn btn-accent" onclick={() => openModal(ds)}>
        + Ajouter un aliment
      </button>
    </div>
  {/each}

  <div style="height:8px"></div>
</div>

<!-- Food modal -->
{#if showModal}
  <FoodModal dayKey={modalDayKey} onclose={() => showModal = false} />
{/if}

<style>
  .header { padding:20px 0 12px; display:flex; align-items:baseline; justify-content:space-between; }
  .header-date { font-size:13px; color:var(--c-text3); }
  .build { font-size:11px; color:var(--c-text3); margin-left:4px; }
  .header-title { font-size:22px; font-weight:700; color:var(--c-text); letter-spacing:-0.5px; }
  .x { color:var(--c-accent); }

  /* Goal card */
  .goal-card { width:100%; text-align:left; font-family:var(--font); cursor:pointer; margin-bottom:8px; }
  .goal-row { display:flex; align-items:center; gap:12px; }
  .goal-main { display:flex; flex-direction:column; gap:1px; min-width:60px; }
  .goal-label { font-size:10px; font-weight:500; text-transform:uppercase; letter-spacing:.06em; color:var(--c-text3); }
  .goal-weight { font-size:18px; font-weight:700; color:var(--c-accent); }
  .goal-dates { flex:1; display:flex; gap:12px; }
  .goal-date-item { display:flex; flex-direction:column; gap:1px; }
  .goal-date-label { font-size:10px; color:var(--c-text3); }
  .goal-date-val { font-size:12px; font-weight:600; color:var(--c-text); }
  .chevron { color:var(--c-text3); transition:transform .2s; flex-shrink:0; }
  .chevron.open { transform:rotate(180deg); }
  .goal-detail { margin-top:14px; padding-top:14px; border-top:0.5px solid var(--c-border); }
  .kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:10px; }
  .kpi { text-align:center; }
  .kpi-v { font-size:16px; font-weight:700; color:var(--c-text); }
  .kpi-l { font-size:10px; color:var(--c-text3); margin-top:1px; }
  .goal-note { font-size:11px; color:var(--c-text3); line-height:1.4; }

  /* Day cards */
  .day-card { margin-bottom:10px; display:flex; flex-direction:column; gap:10px; }
  .day-card.today { border-color:var(--c-accent); border-width:1px; }
  .day-header { display:flex; align-items:center; justify-content:space-between; }
  .day-label { display:flex; align-items:center; gap:6px; }
  .today-badge { background:var(--c-accent); color:var(--c-accent-fg); font-size:10px; font-weight:700; padding:2px 7px; border-radius:10px; text-transform:uppercase; }
  .day-date { font-size:13px; font-weight:600; color:var(--c-text); }
  .weight-field { display:flex; align-items:center; gap:4px; }
  .weight-field input { width:56px; padding:4px 6px; border:1px solid var(--c-border); border-radius:8px; background:var(--c-bg); color:var(--c-text); font-size:13px; text-align:center; font-family:var(--font); }
  .weight-unit { font-size:12px; color:var(--c-text3); }

  .act-select { width:100%; padding:8px 10px; border:1px solid var(--c-border); border-radius:var(--r-md); background:var(--c-surface); color:var(--c-text); font-size:13px; font-family:var(--font); appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; }

  /* Calories */
  .cal-summary { display:flex; align-items:center; gap:8px; }
  .cal-item { display:flex; flex-direction:column; align-items:center; }
  .cal-val { font-size:18px; font-weight:700; color:var(--c-text); }
  .cal-label { font-size:10px; color:var(--c-text3); text-transform:uppercase; letter-spacing:.05em; }
  .cal-item.over .cal-val { color:#e05; }
  .cal-sep { color:var(--c-border); font-size:18px; padding:0 4px; }

  /* Progress */
  .progress-bg { height:6px; background:var(--c-surface2); border-radius:3px; overflow:hidden; }
  .progress-fill { height:100%; background:var(--c-accent); border-radius:3px; transition:width .3s; }
  .progress-fill.over { background:#e05; }

  /* Macros */
  .macro-bar-wrap { display:flex; flex-direction:column; gap:4px; }
  .macro-bar { height:6px; border-radius:3px; overflow:hidden; display:flex; }
  .mb-p { background:#5b9cf6; }
  .mb-g { background:#f5a623; }
  .mb-l { background:#e05; }
  .macro-legend { display:flex; gap:10px; }
  .macro-legend span { display:flex; align-items:center; gap:3px; font-size:11px; color:var(--c-text2); }
  .dot { display:inline-block; width:7px; height:7px; border-radius:50%; }
  .dot.p { background:#5b9cf6; }
  .dot.g { background:#f5a623; }
  .dot.l { background:#e05; }

  /* Foods */
  .foods-list { display:flex; flex-direction:column; gap:4px; }
  .food-item { display:flex; align-items:center; gap:8px; padding:6px 10px; background:var(--c-surface2); border-radius:8px; }
  .food-name { flex:1; font-size:12px; color:var(--c-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .food-kcal { font-size:12px; color:var(--c-text2); flex-shrink:0; }
  .del-btn { border:none; background:none; color:var(--c-text3); font-size:16px; cursor:pointer; padding:0 2px; line-height:1; flex-shrink:0; }

  /* Sport */
  .sport-row { display:flex; align-items:center; gap:8px; }
  .sport-icon { font-size:14px; }
  .sport-input { flex:1; padding:7px 10px; border:1px solid var(--c-border); border-radius:var(--r-md); background:var(--c-surface); color:var(--c-text); font-size:13px; font-family:var(--font); }
  .sport-badge { font-size:11px; color:var(--c-accent); font-weight:600; white-space:nowrap; }

  /* Add food */
  .add-food-btn { width:100%; padding:10px; border:none; border-radius:var(--r-md); background:var(--c-accent); color:var(--c-accent-fg); font-size:14px; font-weight:600; cursor:pointer; font-family:var(--font); }
</style>
