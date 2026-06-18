import { writable, derived } from 'svelte/store';
import type { Locale } from './i18n';
import { createI18n } from './i18n';

export type Theme = 'light' | 'dark';
export type Tab = 'suivi' | 'programme' | 'aliments' | 'amis' | 'reglages';

const savedTheme = (localStorage.getItem('fitpro_theme') as Theme) || 'dark';
export const theme = writable<Theme>(savedTheme);
theme.subscribe(t => {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('fitpro_theme', t);
});

const savedLocale = (localStorage.getItem('fitpro_locale') as Locale) || 'fr';
export const locale = writable<Locale>(savedLocale);
locale.subscribe(l => localStorage.setItem('fitpro_locale', l));

export const t = derived(locale, $l => createI18n($l));

export const activeTab = writable<Tab>('suivi');
export const user = writable<{ email: string; id: string } | null>(null);
export const authLoading = writable(true);
