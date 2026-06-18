<script lang="ts">
  import { t } from "./store";

  const demo = {
    deficit: -487, target: -605,
    proteins: { actual: 122, target: 170 },
    carbs:    { actual: 98,  target: 178 },
    fats:     { actual: 56,  target: 70 },
    cumul: -1840,
    bf_projected: 22.4,
    progress_pct: 8,
    day_count: 3, total_days: 138,
    date: "Mercredi 18 juin",
  };

  function pct(a: number, b: number) { return Math.min(100, Math.round(a / b * 100)); }
  function fmt(n: number) { return (n > 0 ? "+" : "") + n.toLocaleString("fr"); }
</script>

<div class="scroll-area">
  <div class="header">
    <div>
      <div class="label">{$t.dashboard.today}</div>
      <div class="date">{demo.date}</div>
    </div>
    <div class="day-badge">{$t.journal.day}{demo.day_count}<span>/{demo.total_days}</span></div>
  </div>

  <!-- Hero déficit -->
  <div class="card hero-card">
    <div class="label">{$t.dashboard.deficit_day}</div>
    <div class="hero-num">{fmt(demo.deficit)}<span class="hero-unit">kcal</span></div>
    <div class="caption" style="margin-top:6px">{$t.dashboard.target} : {fmt(demo.target)} · {$t.dashboard.in_progress}</div>
  </div>

  <!-- Macros -->
  <div class="macro-row">
    {#each [
      { key: "proteins", label: $t.dashboard.proteins, color: "#d4f53c" },
      { key: "carbs",    label: $t.dashboard.carbs,    color: "#60a5fa" },
      { key: "fats",     label: $t.dashboard.fats,     color: "#f87171" },
    ] as m}
    {@const data = demo[m.key as keyof typeof demo] as { actual: number, target: number }}
    <div class="card macro-card">
      <div class="label">{m.label}</div>
      <div class="progress-bar" style="margin:10px 0 8px">
        <div class="progress-fill" style="width:{pct(data.actual,data.target)}%;background:{m.color}"></div>
      </div>
      <div class="macro-val">{data.actual}<span class="macro-target">/{data.target}g</span></div>
    </div>
    {/each}
  </div>

  <!-- Stats -->
  <div class="stats-row">
    <div class="card stat-card">
      <div class="label">{$t.dashboard.cumul}</div>
      <div class="value-accent">{demo.cumul.toLocaleString("fr")}</div>
      <div class="caption">{$t.dashboard.since_start}</div>
    </div>
    <div class="card stat-card">
      <div class="label">{$t.dashboard.goal_nov}</div>
      <div class="value-sm">{demo.bf_projected}%</div>
      <div class="caption">{$t.dashboard.body_fat_projected}</div>
    </div>
  </div>

  <!-- Progress -->
  <div class="card progress-card">
    <div class="prog-top">
      <span class="label">{$t.dashboard.progress}</span>
      <span class="badge-accent">{demo.progress_pct}%</span>
    </div>
    <div class="progress-bar" style="margin-top:12px">
      <div class="progress-fill" style="width:{demo.progress_pct}%"></div>
    </div>
    <div class="caption" style="margin-top:8px">{demo.day_count} jours sur {demo.total_days}</div>
  </div>
</div>

<style>
.header { display:flex; align-items:center; justify-content:space-between; padding:20px 0 16px; }
.date { font-size:22px; font-weight:500; color:var(--c-text); margin-top:3px; letter-spacing:-0.3px; }
.day-badge { font-size:13px; font-weight:600; color:var(--c-text2); }
.day-badge span { font-weight:400; color:var(--c-text3); }

.hero-card { margin-bottom:10px; padding:20px; }
.hero-num { font-size:52px; font-weight:200; letter-spacing:-3px; color:var(--c-text); line-height:1; margin:8px 0 0; }
.hero-unit { font-size:18px; font-weight:400; letter-spacing:0; margin-left:3px; color:var(--c-text2); }

.macro-row { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:10px; }
.macro-card { padding:14px; }
.macro-val { font-size:18px; font-weight:600; color:var(--c-text); }
.macro-target { font-size:11px; font-weight:400; color:var(--c-text3); }

.stats-row { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px; }
.stat-card { display:flex; flex-direction:column; gap:4px; padding:16px; }
.value-accent { font-size:24px; font-weight:500; color:var(--c-accent); letter-spacing:-0.5px; }
.value-sm { font-size:24px; font-weight:500; letter-spacing:-0.5px; color:var(--c-text); }

.progress-card { padding:18px; }
.prog-top { display:flex; align-items:center; justify-content:space-between; }
</style>
