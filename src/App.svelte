<script lang="ts">
  import { theme, activeTab, session, authLoading, appData, persistSession, restoreSession, t } from "./lib/store";
  import { loadAppState } from "./lib/supabase";
  import AuthGate from "./lib/AuthGate.svelte";
  import BottomNav from "./lib/BottomNav.svelte";
  import Dashboard from "./lib/Dashboard.svelte";
  import Journal from "./lib/Journal.svelte";
  import Settings from "./lib/Settings.svelte";
  import { get } from "svelte/store";
  import { onMount } from "svelte";

  document.documentElement.setAttribute("data-theme", get(theme));

  onMount(async () => {
    const saved = restoreSession();
    if (saved) {
      session.set(saved);
      const data = await loadAppState(saved.access_token);
      appData.set(data);
    }
    authLoading.set(false);
  });

  // When session changes, load app data
  session.subscribe(async (s) => {
    if (s) {
      const data = await loadAppState(s.access_token);
      appData.set(data);
    }
  });
</script>

{#if $authLoading}
  <div class="loading">{$t.common.loading}</div>
{:else if !$session}
  <AuthGate />
{:else}
  {#if $activeTab === "suivi"}<Dashboard />{/if}
  {#if $activeTab === "programme"}<Journal />{/if}
  {#if $activeTab === "aliments"}
    <div class="scroll-area"><div class="placeholder">Aliments — bientôt</div></div>
  {/if}
  {#if $activeTab === "amis"}
    <div class="scroll-area"><div class="placeholder">Amis — bientôt</div></div>
  {/if}
  {#if $activeTab === "reglages"}<Settings />{/if}
  <BottomNav />
{/if}

<style>
.loading { flex:1; display:flex; align-items:center; justify-content:center; color:var(--c-text3); font-size:14px; }
.placeholder { padding:60px 0; text-align:center; color:var(--c-text3); font-size:14px; }
</style>
