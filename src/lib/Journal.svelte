<script lang="ts">
  import { t } from "./store";

  const days = [
    { date: "Mercredi 18 juin", type: "Cardio léger", eaten: 1645, deficit: -487, isToday: true,  color: "#d4f53c" },
    { date: "Mardi 17 juin",    type: "Repos",        eaten: 1780, deficit: -622, isToday: false, color: "#4ade80" },
    { date: "Lundi 16 juin",    type: "Muscu",        eaten: 2250, deficit: -130, isToday: false, color: "#f87171" },
  ];

  function fmt(n: number) { return (n > 0 ? "+" : "") + n; }
</script>

<div class="scroll-area">
  <div class="jheader">
    <div class="label">{$t.nav.journal}</div>
    <div class="jtitle">{$t.journal.title}</div>
  </div>

  <div class="day-list">
    {#each days as d}
    <div class="day-card" class:today={d.isToday}>
      <div class="dot" style="background:{d.color}"></div>
      <div class="day-info">
        <div class="day-name">{d.date}</div>
        <div class="day-type" style="color:{d.isToday ? 'var(--c-accent)' : 'var(--c-text3)'}">
          {d.type}{d.isToday ? " · " + $t.journal.in_progress : ""}
        </div>
      </div>
      <div class="day-right">
        <div class="day-kcal">{d.eaten.toLocaleString("fr")}</div>
        <div class="day-kcal-label">{$t.journal.eaten}</div>
        <div class="day-deficit" style="color:{d.deficit < -550 ? 'var(--c-green)' : d.deficit > -200 ? 'var(--c-red)' : 'var(--c-accent)'}">
          {fmt(d.deficit)} kcal
        </div>
      </div>
    </div>
    {/each}

    <button class="add-btn">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      {$t.journal.add_meal}
    </button>
  </div>
</div>

<style>
.jheader { padding:20px 0 14px; }
.jtitle { font-size:17px; font-weight:500; color:var(--c-text); margin-top:2px; }
.day-list { display:flex; flex-direction:column; gap:8px; }
.day-card { background:var(--c-surface); border:0.5px solid var(--c-border); border-radius:var(--r-lg); padding:14px; display:flex; align-items:center; gap:12px; }
.day-card.today { border-color:var(--c-accent); }
.dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.day-info { flex:1; }
.day-name { font-size:13px; font-weight:500; color:var(--c-text); }
.day-type { font-size:11px; margin-top:2px; }
.day-right { text-align:right; }
.day-kcal { font-size:15px; font-weight:600; color:var(--c-text); }
.day-kcal-label { font-size:10px; color:var(--c-text3); }
.day-deficit { font-size:11px; font-weight:500; margin-top:2px; }
.add-btn { width:100%; background:var(--c-surface); border:0.5px dashed var(--c-border2); border-radius:var(--r-lg); padding:14px; display:flex; align-items:center; justify-content:center; gap:8px; color:var(--c-text3); font-size:13px; cursor:pointer; font-family:var(--font); }
.add-btn:hover { background:var(--c-surface2); }
</style>
