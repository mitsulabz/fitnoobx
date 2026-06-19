<script lang="ts">
  import { theme, activeTab, session, authLoading, appData, persistSession, restoreSession, rawRow, scheduleSync } from "./lib/store";
  import { loadAppState, refreshToken, upsertProfile } from "./lib/supabase";
  import AuthGate from "./lib/AuthGate.svelte";
  import BottomNav from "./lib/BottomNav.svelte";
  import Dashboard from "./lib/Dashboard.svelte";
  import Aliments from "./lib/Aliments.svelte";
  import Amis from "./lib/Amis.svelte";
  import Settings from "./lib/Settings.svelte";
  import { get } from "svelte/store";
  import { onMount } from "svelte";

  document.documentElement.setAttribute("data-theme", get(theme));

  const DEFAULT_STATE = {
    profile: { age: 0, sex: 'h', height: 0, weight: 0, bf: 0, bft: 0, act: '1.30', sportHours: 0, goalMode: 'weight', goalWeight: 0 },
    days: {},
    favorites: [],
    sports: [],
    _ts: 0,
  };

  async function loadData(s: typeof $session) {
    if (!s) return;
    try {
      const full = await loadAppState(s.access_token, s.user.id);
      if (full) {
        rawRow.set(full);
        // Extract fitnoobx namespace — fall back to root if it looks like FitNoob format
        const noob = (full as any).fitnoobx ?? (
          (full as any).profile ? full : null
        );
        appData.set(noob ?? { ...DEFAULT_STATE });
      } else {
        // Try refresh
        try {
          const newSession = await refreshToken(s.refresh_token);
          persistSession(newSession);
          const retryFull = await loadAppState(newSession.access_token, newSession.user.id);
          if (retryFull) {
            rawRow.set(retryFull);
            const noob = (retryFull as any).fitnoobx ?? ((retryFull as any).profile ? retryFull : null);
            appData.set(noob ?? { ...DEFAULT_STATE });
          } else {
            appData.set({ ...DEFAULT_STATE });
          }
        } catch {
          persistSession(null);
        }
      }
      upsertProfile(s.access_token, s.user.id, s.user.email);
    } catch {
      appData.set({ ...DEFAULT_STATE });
    }
  }

  onMount(async () => {
    const saved = restoreSession();
    if (saved) {
      session.set(saved);
      await loadData(saved);
    }
    authLoading.set(false);
  });

  let firstRun = true;
  session.subscribe(async (s) => {
    if (firstRun) { firstRun = false; return; }
    await loadData(s);
  });
</script>

{#if $authLoading}
  <div class="loading">Chargement…</div>
{:else if !$session}
  <AuthGate />
{:else}
  {#if $activeTab === "suivi"}<Dashboard />{/if}
  {#if $activeTab === "aliments"}<Aliments />{/if}
  {#if $activeTab === "amis"}<Amis />{/if}
  {#if $activeTab === "reglages"}<Settings />{/if}
  <BottomNav />
{/if}

<style>
.loading { flex:1; display:flex; align-items:center; justify-content:center; color:var(--c-text3); font-size:14px; }
</style>
