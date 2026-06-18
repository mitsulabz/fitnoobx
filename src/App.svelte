<script lang="ts">
  import { theme, activeTab, user, authLoading, t } from "./lib/store";
  import AuthGate from "./lib/AuthGate.svelte";
  import BottomNav from "./lib/BottomNav.svelte";
  import Dashboard from "./lib/Dashboard.svelte";
  import Journal from "./lib/Journal.svelte";
  import Settings from "./lib/Settings.svelte";
  import { get } from "svelte/store";

  document.documentElement.setAttribute("data-theme", get(theme));

  // Dev mode — skip auth
  authLoading.set(false);
  user.set({ email: "demo@fitpro.app", id: "demo" });
</script>

{#if $authLoading}
  <div class="loading">{$t.common.loading}</div>
{:else if !$user}
  <AuthGate />
{:else}
  {#if $activeTab === "dashboard"}<Dashboard />{/if}
  {#if $activeTab === "journal"}<Journal />{/if}
  {#if $activeTab === "stats"}
    <div class="scroll-area"><div style="padding:40px 0;text-align:center;color:var(--c-text3)">Stats — bientôt</div></div>
  {/if}
  {#if $activeTab === "settings"}<Settings />{/if}
  <BottomNav />
{/if}

<style>
.loading { flex:1; display:flex; align-items:center; justify-content:center; color:var(--c-text3); font-size:14px; }
</style>
