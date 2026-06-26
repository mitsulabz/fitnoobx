<script lang="ts">
  import { session, persistSession } from './store';
  import { refreshToken, getFriendships, getProfiles, findProfileByEmail,
           sendFriendRequestDB, updateFriendship, loadFriendAppState } from './supabase';
  import { get } from 'svelte/store';

  type Friendship = { id: string; requester_id: string; addressee_id: string; status: string };
  type Profile = { user_id: string; email: string };
  type FriendData = { profile?: any; days?: any; programme?: any };

  let emailInput = $state('');
  let addMsg = $state('');
  let addMsgOk = $state(false);
  let loading = $state(true);
  let friendships = $state<Friendship[]>([]);
  let emails = $state<Record<string, string>>({});

  // Profile modal
  let modalOpen = $state(false);
  let modalEmail = $state('');
  let modalData = $state<FriendData | null>(null);
  let modalLoading = $state(false);

  async function getToken(): Promise<string> {
    const s = get(session);
    if (!s) return '';
    try {
      const fresh = await refreshToken(s.refresh_token);
      persistSession(fresh);
      return fresh.access_token;
    } catch { return s.access_token; }
  }

  function myId(): string { return get(session)?.user?.id ?? ''; }

  async function loadFriends() {
    loading = true;
    const token = await getToken();
    const fs: Friendship[] = await getFriendships(token, myId());
    friendships = fs;
    // collect all user ids
    const ids = [...new Set(fs.flatMap(f => [f.requester_id, f.addressee_id]).filter(id => id !== myId()))];
    const profs: Profile[] = await getProfiles(token, ids);
    emails = Object.fromEntries(profs.map(p => [p.user_id, p.email]));
    loading = false;
  }

  loadFriends();

  const pending = $derived(friendships.filter(f => f.status === 'pending' && f.addressee_id === myId()));
  const accepted = $derived(friendships.filter(f => f.status === 'accepted'));

  async function sendRequest() {
    const email = emailInput.trim().toLowerCase();
    addMsg = ''; addMsgOk = false;
    if (!email) return;
    const token = await getToken();
    // check not self
    if (email === get(session)?.user?.email) { addMsg = 'Tu ne peux pas t\'ajouter toi-même.'; return; }
    // check not already friends/pending
    const prof = await findProfileByEmail(token, email);
    if (!prof) { addMsg = 'Aucun compte trouvé pour cet email.'; return; }
    const existing = friendships.find(f =>
      (f.requester_id === prof.user_id || f.addressee_id === prof.user_id)
    );
    if (existing) {
      addMsg = existing.status === 'accepted' ? 'Vous êtes déjà amis !' : 'Demande déjà en cours.';
      return;
    }
    const ok = await sendFriendRequestDB(token, myId(), prof.user_id);
    if (ok) { addMsg = 'Demande envoyée ✓'; addMsgOk = true; emailInput = ''; await loadFriends(); }
    else { addMsg = 'Erreur lors de l\'envoi.'; }
  }

  async function respond(id: string, status: 'accepted' | 'declined') {
    const token = await getToken();
    await updateFriendship(token, id, status);
    await loadFriends();
  }

  async function openProfile(uid: string, email: string) {
    modalEmail = email;
    modalData = null;
    modalLoading = true;
    modalOpen = true;
    const token = await getToken();
    const data = await loadFriendAppState(token, uid);
    modalData = data ?? {};
    modalLoading = false;
  }

  function friendId(f: Friendship): string {
    return f.requester_id === myId() ? f.addressee_id : f.requester_id;
  }

  // ---- profil ami : calculs ----
  function num(v: any) { return parseFloat(v) || 0; }

  function friendBMR(p: any): number {
    const w = num(p.weight), h = num(p.height), a = num(p.age);
    if (!w) return 0;
    if (p.bf) { const lbm = w * (1 - num(p.bf) / 100); return Math.round(370 + 21.6 * lbm); }
    if (!h || !a) return 0;
    const base = 10 * w + 6.25 * h - 5 * a;
    return Math.round(p.sex === 'f' ? base - 161 : base + 5);
  }

  function actFactor(act: string): number {
    const f: Record<string, number> = {
      '1.10':1.10,'1.20':1.20,'1.30':1.30,'1.40':1.40,'1.50':1.50,
      '1.60':1.60,'1.70':1.70,'1.725':1.725,'1.80':1.80,'1.90':1.90,'2.00':2.00,
      sed:1.30, act:1.55, sup:1.725
    };
    return f[act] ?? 1.30;
  }

  function dsToDate(ds: string): Date {
    const [d, m, y] = ds.split('/');
    return new Date(+y, +m - 1, +d);
  }

  function todayDS(): string {
    return new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
  }

  function frDate(ds: string): string {
    return dsToDate(ds).toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' });
  }

  const recentDays = $derived.by(() => {
    if (!modalData?.days) return [];
    const tds = todayDS();
    const todayD = dsToDate(tds);
    return Object.keys(modalData.days)
      .filter(ds => {
        const d = dsToDate(ds);
        const day = (modalData!.days as any)[ds];
        return d <= todayD && (ds === tds || (day.foods?.length));
      })
      .sort((a, b) => dsToDate(b).getTime() - dsToDate(a).getTime())
      .slice(0, 14);
  });
</script>

<div class="scroll-area">
  <div class="header">
    <div class="title">Amis</div>
  </div>

  <!-- Ajouter un ami -->
  <div class="card add-card">
    <div class="card-title">Ajouter un ami</div>
    <p class="hint">Entre l'adresse email de ton ami pour lui envoyer une demande.</p>
    <form class="add-row" onsubmit={(e) => { e.preventDefault(); sendRequest(); }}>
      <input type="email" placeholder="email@exemple.com" bind:value={emailInput} autocomplete="off" />
      <button type="submit" class="btn-accent">Inviter</button>
    </form>
    {#if addMsg}
      <div class="add-msg" class:ok={addMsgOk}>{addMsg}</div>
    {/if}
  </div>

  {#if loading}
    <div class="empty">Chargement…</div>
  {:else}

    <!-- Demandes reçues -->
    {#if pending.length > 0}
      <div class="card">
        <div class="card-title">Demandes reçues</div>
        {#each pending as f}
          <div class="req-row">
            <div class="req-info">
              <div class="req-name">{emails[f.requester_id] ?? '…'}</div>
              <div class="req-sub">veut être ton ami</div>
            </div>
            <button class="btn-ok" onclick={() => respond(f.id, 'accepted')}>✓</button>
            <button class="btn-no" onclick={() => respond(f.id, 'declined')}>✕</button>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Mes amis -->
    <div class="card">
      <div class="card-title">Mes amis</div>
      {#if accepted.length === 0}
        <div class="empty-inline">Aucun ami pour l'instant. Ajoute quelqu'un avec son email !</div>
      {:else}
        {#each accepted as f}
          {@const uid = friendId(f)}
          <button class="friend-row" onclick={() => openProfile(uid, emails[uid] ?? uid)}>
            <div class="friend-avatar">{(emails[uid] ?? '?')[0].toUpperCase()}</div>
            <div class="friend-info">
              <div class="friend-name">{emails[uid] ?? uid}</div>
              <div class="friend-sub">Voir le profil →</div>
            </div>
          </button>
        {/each}
      {/if}
    </div>

  {/if}
</div>

<!-- Modal profil ami -->
{#if modalOpen}
  <div class="overlay" role="dialog" aria-modal="true">
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">{modalEmail}</span>
        <button class="close-btn" onclick={() => modalOpen = false}>✕</button>
      </div>
      <div class="modal-body">
        {#if modalLoading}
          <div class="empty">Chargement…</div>
        {:else if !modalData?.profile}
          <div class="empty">Profil non disponible.</div>
        {:else}
          {@const p = modalData.profile}
          {@const bmr = friendBMR(p)}
          {@const w = num(p.weight)}
            {@const bf = num(p.bf)}
            {@const bft = num(p.bft)}

          <!-- Profil stats -->
          <div class="section-title">Profil</div>
          <div class="kpi-grid">
            {#if p.age}<div class="kpi"><div class="kpi-v">{p.age}</div><div class="kpi-l">Âge</div></div>{/if}
            {#if w}<div class="kpi"><div class="kpi-v">{w}</div><div class="kpi-l">Poids kg</div></div>{/if}
            {#if p.height}<div class="kpi"><div class="kpi-v">{p.height}</div><div class="kpi-l">Taille cm</div></div>{/if}
            {#if bf}<div class="kpi"><div class="kpi-v">{bf}%</div><div class="kpi-l">Masse grasse</div></div>{/if}
            {#if bft}<div class="kpi"><div class="kpi-v">{bft}%</div><div class="kpi-l">Objectif MG</div></div>{/if}
            {#if bmr}<div class="kpi"><div class="kpi-v">{bmr}</div><div class="kpi-l">BMR kcal</div></div>{/if}
          </div>

          <!-- Objectif progression -->
          {#if w && bf && bft && bft < bf}
            {@const lean = w * (1 - bf / 100)}
            {@const targetW = lean / (1 - bft / 100)}
            {@const fatToLose = w - targetW}
            {@const kcalTotal = fatToLose * 7700}
            {@const tds = todayDS()}
            {@const cum = Object.entries(modalData.days ?? {}).reduce((acc: number, [ds, d]: [string, any]) => {
              if (dsToDate(ds) >= dsToDate(tds) || !d.foods?.length) return acc;
              const sport = Math.round((num(p.sportHours) * 500) / 7);
              const exp = Math.round(bmr * actFactor(d.act ?? p.act ?? '1.30')) + sport;
              return acc + (exp - Math.round(d.foods.reduce((s: number, f: any) => s + f.k, 0)));
            }, 0)}
            {@const prog = Math.min(100, Math.max(0, cum / kcalTotal * 100))}
            <div class="section-title" style="margin-top:14px">Objectif</div>
            <div class="goal-block">
              <div class="goal-label">→ {targetW.toFixed(1)} kg · {bft}% MG</div>
              <div class="goal-pct">{prog.toFixed(1)}%</div>
              <div class="progress-bar"><div class="progress-fill" style="width:{prog}%"></div></div>
              <div class="goal-sub">{(cum/7700).toFixed(2)} kg perdus sur {fatToLose.toFixed(1)} kg</div>
            </div>
          {/if}

          <!-- Aujourd'hui -->
          {@const tds2 = todayDS()}
          {@const td = (modalData.days ?? {})[tds2]}
          <div class="section-title" style="margin-top:14px">Aujourd'hui</div>
          {#if td?.foods?.length}
            {@const k = Math.round(td.foods.reduce((s: number, f: any) => s + f.k, 0))}
            {@const exp = bmr ? Math.round(bmr * actFactor(td.act ?? p.act ?? '1.30')) + Math.round((num(p.sportHours) * 500) / 7) : 0}
            {@const def = exp - k}
            <div class="today-row">
              <div class="kpi"><div class="kpi-v">{k}</div><div class="kpi-l">Ingéré kcal</div></div>
              {#if exp}<div class="kpi"><div class="kpi-v">{exp}</div><div class="kpi-l">Dépensé kcal</div></div>{/if}
              {#if exp}<div class="kpi"><div class="kpi-v" style="color:{def>=0?'var(--c-accent)':'var(--c-red)'}">{def>=0?'+':''}{def}</div><div class="kpi-l">Déficit kcal</div></div>{/if}
            </div>
          {:else}
            <div class="empty-inline">Pas encore de repas loggés.</div>
          {/if}

          <!-- Historique -->
          {#if p.shareHistory && recentDays.length > 0}
            <div class="section-title" style="margin-top:14px">Suivi récent</div>
            {#each recentDays as ds}
              {@const d = (modalData.days ?? {})[ds]}
              {@const foods = d.foods ?? []}
              {@const k = Math.round(foods.reduce((s: number, f: any) => s + f.k, 0))}
              {@const exp = bmr ? Math.round(bmr * actFactor(p.act ?? '1.30')) + Math.round((num(p.sportHours) * 500) / 7) : 0}
              {@const def = exp - k}
              <details class="hist-day">
                <summary class="hist-summary">
                  <span class="hist-date">{frDate(ds)}</span>
                  <span class="hist-stats">
                    {#if k}<span>{k} kcal</span>{/if}
                    {#if exp && k}<span style="color:{def>=0?'var(--c-accent)':'var(--c-red)'}">{def>=0?'+':''}{def}</span>{/if}
                  </span>
                </summary>
                {#if foods.length > 0}
                  <ul class="hist-foods">
                    {#each foods as food}
                      <li><span class="food-n">{food.n}</span><span class="food-k">{Math.round(food.k)} kcal</span></li>
                    {/each}
                  </ul>
                {:else}
                  <p class="hist-empty">Aucun aliment loggé.</p>
                {/if}
              </details>
            {/each}
          {:else if p.shareHistory === false}
            <div class="empty-inline" style="margin-top:14px">Cet ami ne partage pas son historique.</div>
          {/if}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
.header { padding:20px 0 14px; }
.title { font-size:20px; font-weight:500; color:var(--c-text); }
.card { background:var(--c-surface); border:0.5px solid var(--c-border); border-radius:var(--r-lg); padding:16px; margin-bottom:10px; }
.card-title { font-size:14px; font-weight:600; color:var(--c-text); margin-bottom:10px; }
.hint { font-size:13px; color:var(--c-text2); margin:0 0 10px; }
.add-row { display:flex; gap:8px; }
.add-row input { flex:1; padding:9px 12px; border:1px solid var(--c-border); border-radius:var(--r-md); background:var(--c-bg); color:var(--c-text); font-size:14px; font-family:var(--font); }
.add-row input:focus { outline:none; border-color:var(--c-accent); }
.btn-accent { padding:9px 16px; border:none; border-radius:var(--r-md); background:var(--c-accent); color:var(--c-accent-fg); font-size:14px; font-weight:600; cursor:pointer; font-family:var(--font); white-space:nowrap; }
.add-msg { font-size:13px; color:var(--c-red,#e05); margin-top:8px; }
.add-msg.ok { color:var(--c-accent); }
.empty { text-align:center; color:var(--c-text3); font-size:13px; padding:30px 0; }
.empty-inline { font-size:13px; color:var(--c-text3); padding:8px 0; }

/* Demandes */
.req-row { display:flex; align-items:center; gap:8px; padding:10px 0; border-bottom:0.5px solid var(--c-border); }
.req-row:last-child { border-bottom:none; }
.req-info { flex:1; }
.req-name { font-size:13px; font-weight:500; color:var(--c-text); }
.req-sub { font-size:11px; color:var(--c-text3); }
.btn-ok { width:32px; height:32px; border:none; border-radius:50%; background:var(--c-accent); color:var(--c-accent-fg); font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.btn-no { width:32px; height:32px; border:none; border-radius:50%; background:var(--c-surface2,var(--c-border)); color:var(--c-text2); font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; }

/* Liste amis */
.friend-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:0.5px solid var(--c-border); width:100%; background:none; border-top:none; border-left:none; border-right:none; text-align:left; cursor:pointer; font-family:var(--font); }
.friend-row:last-child { border-bottom:none; }
.friend-row:hover .friend-name { color:var(--c-accent); }
.friend-avatar { width:36px; height:36px; border-radius:50%; background:var(--c-accent-bg,#fce7f0); color:var(--c-accent); font-size:15px; font-weight:600; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.friend-name { font-size:13px; font-weight:500; color:var(--c-text); }
.friend-sub { font-size:11px; color:var(--c-text3); margin-top:1px; }

/* Modal */
.overlay { position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:200; display:flex; align-items:flex-end; }
.modal { width:100%; max-height:88dvh; background:var(--c-bg); border-radius:20px 20px 0 0; display:flex; flex-direction:column; overflow:hidden; }
.modal-header { display:flex; align-items:center; justify-content:space-between; padding:16px 18px 12px; border-bottom:0.5px solid var(--c-border); flex-shrink:0; }
.modal-title { font-size:15px; font-weight:600; color:var(--c-text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.close-btn { border:none; background:none; color:var(--c-text3); font-size:18px; cursor:pointer; padding:4px; flex-shrink:0; }
.modal-body { overflow-y:auto; padding:16px 18px 32px; }
.section-title { font-size:11px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--c-text3); margin-bottom:10px; }
.kpi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:4px; }
.kpi { background:var(--c-surface); border:0.5px solid var(--c-border); border-radius:var(--r-md); padding:10px; text-align:center; }
.kpi-v { font-size:18px; font-weight:600; color:var(--c-text); }
.kpi-l { font-size:10px; color:var(--c-text3); margin-top:2px; }
.goal-block { background:var(--c-surface); border:0.5px solid var(--c-border); border-radius:var(--r-md); padding:14px; }
.goal-label { font-size:13px; font-weight:500; color:var(--c-text); margin-bottom:8px; }
.goal-pct { font-size:24px; font-weight:500; color:var(--c-accent); }
.goal-sub { font-size:12px; color:var(--c-text2); margin-top:6px; }
.today-row { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.hist-day { border-bottom:0.5px solid var(--c-border); }
.hist-day:last-child { border-bottom:none; }
.hist-summary { display:flex; align-items:center; justify-content:space-between; padding:10px 0; cursor:pointer; list-style:none; }
.hist-summary::-webkit-details-marker { display:none; }
.hist-date { font-size:13px; color:var(--c-text2); }
.hist-stats { display:flex; gap:12px; font-size:12px; font-weight:500; color:var(--c-text); }
.hist-foods { list-style:none; padding:0 0 10px; margin:0; display:flex; flex-direction:column; gap:3px; }
.hist-foods li { display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:12px; padding:2px 8px; }
.hist-foods .food-n { color:var(--c-text2); flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.hist-foods .food-k { color:var(--c-text3); flex-shrink:0; }
.hist-empty { font-size:12px; color:var(--c-text3); padding:0 0 10px 8px; margin:0; }
</style>
