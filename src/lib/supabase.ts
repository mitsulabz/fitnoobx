const SUPABASE_URL = 'https://arydsxswhbgpfayjgtak.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeWRzeHN3aGJncGZheWpndGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzODU1NzcsImV4cCI6MjA5Njk2MTU3N30.JwhGPqopTzi74jv-1zM5JSOAZ0O78p1Q667pB4ZMcH8';

const headers = (token?: string) => ({
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON,
  ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
});

export interface Session {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string };
}

export async function signIn(email: string, password: string): Promise<Session> {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error_description || d.msg || 'Erreur de connexion');
  return d as Session;
}

export async function refreshToken(refresh_token: string): Promise<Session> {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ refresh_token }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error('Token expiré');
  return d as Session;
}

export async function signOut(token: string) {
  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: 'POST',
    headers: headers(token),
  });
}

export async function loadAppState(token: string, userId: string): Promise<Record<string, unknown> | null> {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/app_state?select=data&user_id=eq.${userId}&limit=1`,
    { headers: headers(token) }
  );
  if (!r.ok) return null;
  const rows = await r.json();
  return rows?.[0]?.data ?? null;
}

export async function saveAppState(token: string, userId: string, data: unknown) {
  await fetch(`${SUPABASE_URL}/rest/v1/app_state`, {
    method: 'POST',
    headers: { ...headers(token), 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: userId, data, updated_at: new Date().toISOString() }),
  });
}

export async function upsertProfile(token: string, userId: string, email: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: { ...headers(token), 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: userId, email }),
  });
}

export async function getFriendships(token: string, userId: string) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/friendships?or=(requester_id.eq.${userId},addressee_id.eq.${userId})&select=*`,
    { headers: headers(token) }
  );
  return r.ok ? await r.json() : [];
}

export async function getProfiles(token: string, userIds: string[]) {
  if (!userIds.length) return [];
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${userIds.join(',')})&select=user_id,email`,
    { headers: headers(token) }
  );
  return r.ok ? await r.json() : [];
}

export async function findProfileByEmail(token: string, email: string) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=user_id,email&limit=1`,
    { headers: headers(token) }
  );
  if (!r.ok) return null;
  const rows = await r.json();
  return rows[0] ?? null;
}

export async function sendFriendRequestDB(token: string, requesterId: string, addresseeId: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/friendships`, {
    method: 'POST',
    headers: { ...headers(token), 'Prefer': 'return=minimal' },
    body: JSON.stringify({ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' }),
  });
  return r.ok;
}

export async function updateFriendship(token: string, id: string, status: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/friendships?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...headers(token), 'Prefer': 'return=minimal' },
    body: JSON.stringify({ status }),
  });
}

export async function loadFriendAppState(token: string, userId: string) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/app_state?select=data&user_id=eq.${userId}&limit=1`,
    { headers: headers(token) }
  );
  if (!r.ok) return null;
  const rows = await r.json();
  return rows?.[0]?.data ?? null;
}
