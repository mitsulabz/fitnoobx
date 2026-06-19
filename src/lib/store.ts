import { writable, derived, get } from 'svelte/store';
import { saveAppState } from './supabase';
import type { Session } from './supabase';

export type Theme = 'light' | 'dark';
export type Tab = 'suivi' | 'aliments' | 'amis' | 'reglages';

// Theme
const savedTheme = (localStorage.getItem('fitnoob_theme') as Theme) || 'dark';
export const theme = writable<Theme>(savedTheme);
theme.subscribe(t => {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('fitnoob_theme', t);
});

// Navigation
export const activeTab = writable<Tab>('suivi');

// Auth
export const session = writable<Session | null>(null);
export const authLoading = writable(true);

// Full Supabase row (for merging fitnoobx namespace)
export const rawRow = writable<Record<string, unknown>>({});

// App data — FitNoob format: { profile, days, favorites, sports, _ts }
export const appData = writable<Record<string, unknown> | null>(null);

export function persistSession(s: Session | null) {
  if (s) localStorage.setItem('fitnoob_session', JSON.stringify(s));
  else localStorage.removeItem('fitnoob_session');
  session.set(s);
}

export function restoreSession(): Session | null {
  try {
    const raw = localStorage.getItem('fitnoob_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// Persist FitNoobX data — merges under rawRow.fitnoobx to avoid clobbering FitProUX data
let _syncTimer: ReturnType<typeof setTimeout> | null = null;


export function scheduleSync(s: Session, data: unknown) {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    const current = get(rawRow);
    const merged = { ...current, fitnoobx: data };
    rawRow.set(merged);
    saveAppState(s.access_token, s.user.id, merged);
  }, 1500);
}

export function syncNow(s: Session, data: unknown) {
  if (_syncTimer) clearTimeout(_syncTimer);
  const current = get(rawRow);
  const merged = { ...current, fitnoobx: data };
  rawRow.set(merged);
  saveAppState(s.access_token, s.user.id, merged);
}
