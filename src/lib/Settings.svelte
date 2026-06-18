<script lang="ts">
  import { theme, t } from "./store";
  function toggleTheme() { theme.update(v => v === "dark" ? "light" : "dark"); }
</script>

<div class="scroll-area">
  <div class="sheader">
    <div class="label">{$t.nav.settings}</div>
    <div class="stitle">{$t.nav.settings}</div>
  </div>

  <div class="section">
    <button class="card setting-row" onclick={toggleTheme}>
      <span class="body">Thème</span>
      <div class="pill">{$theme === "dark" ? "Sombre" : "Clair"}</div>
    </button>
  </div>

  <div class="version caption">FitPro UX · V0.1</div>
</div>

<style>
.sheader { padding:20px 0 14px; }
.stitle { font-size:17px; font-weight:500; color:var(--c-text); margin-top:2px; }
.section { display:flex; flex-direction:column; gap:8px; margin-bottom:20px; }
.setting-row { display:flex; align-items:center; justify-content:space-between; cursor:pointer; width:100%; text-align:left; font-family:var(--font); }
.pill { background:var(--c-surface2); border:0.5px solid var(--c-border2); border-radius:20px; padding:4px 12px; font-size:12px; font-weight:500; color:var(--c-text2); }
.version { text-align:center; margin-top:32px; }
</style>
