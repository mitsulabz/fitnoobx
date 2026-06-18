export type Locale = 'fr' | 'en';

const fr = {
  nav: { dashboard: 'Bilan', journal: 'Journal', stats: 'Stats', settings: 'Réglages' },
  dashboard: {
    today: "Aujourd'hui",
    deficit_day: 'Déficit du jour',
    target: 'Cible',
    in_progress: 'en cours…',
    proteins: 'Protéines',
    carbs: 'Glucides',
    fats: 'Lipides',
    cumul: 'Cumul programme',
    since_start: 'depuis J1',
    goal_nov: 'Objectif Nov.',
    body_fat_projected: 'masse grasse projetée',
    progress: 'Progression programme',
  },
  journal: {
    title: 'Journal',
    day: 'J',
    add_meal: 'Ajouter un repas',
    in_progress: 'en cours',
    eaten: 'kcal mangé',
  },
  auth: {
    title: 'FitPro',
    subtitle: 'Suivi nutrition & performance',
    email: 'Email',
    password: 'Mot de passe',
    signin: 'Se connecter',
    signing_in: 'Connexion…',
    error: 'Email ou mot de passe incorrect',
  },
  common: {
    kcal: 'kcal',
    g: 'g',
    kg: 'kg',
    pct: '%',
    loading: 'Chargement…',
  },
};

const en: typeof fr = {
  nav: { dashboard: 'Dashboard', journal: 'Journal', stats: 'Stats', settings: 'Settings' },
  dashboard: {
    today: 'Today',
    deficit_day: "Today's deficit",
    target: 'Target',
    in_progress: 'in progress…',
    proteins: 'Proteins',
    carbs: 'Carbs',
    fats: 'Fats',
    cumul: 'Programme total',
    since_start: 'since day 1',
    goal_nov: 'Goal Nov.',
    body_fat_projected: 'projected body fat',
    progress: 'Programme progress',
  },
  journal: {
    title: 'Journal',
    day: 'D',
    add_meal: 'Add a meal',
    in_progress: 'in progress',
    eaten: 'kcal eaten',
  },
  auth: {
    title: 'FitPro',
    subtitle: 'Nutrition & performance tracking',
    email: 'Email',
    password: 'Password',
    signin: 'Sign in',
    signing_in: 'Signing in…',
    error: 'Incorrect email or password',
  },
  common: {
    kcal: 'kcal',
    g: 'g',
    kg: 'kg',
    pct: '%',
    loading: 'Loading…',
  },
};

const translations = { fr, en };

export function createI18n(locale: Locale = 'fr') {
  return translations[locale];
}
