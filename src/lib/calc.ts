// Calculs nutritionnels FitNoob (Katch-McArdle / Mifflin-St-Jeor)

export const ACT_LEVELS = [
  { key: '1.10', label: 'Bloqué au lit',                       desc: 'maladie, < 2 000 pas/j' },
  { key: '1.20', label: 'Canap / bureau / voiture',            desc: 'très sédentaire · 2–4k pas/j' },
  { key: '1.30', label: 'Courses, tâches ménagères légères',   desc: 'bouge un peu · 4–6k pas/j' },
  { key: '1.40', label: "S'active quotidiennement",            desc: 'beaucoup de déplacements · 6–9k pas/j' },
  { key: '1.50', label: 'Travail debout / bouge tout le temps', desc: 'marche régulière · 9–12k pas/j' },
  { key: '1.60', label: 'Métier physique léger',               desc: 'très actif · >12k pas/j' },
  { key: '1.75', label: 'Métier physique dur',                 desc: 'artisan, manutention, serveur actif' },
  { key: '2.00', label: "Bouge autant qu'un sportif pro",      desc: 'agriculture, chantier, sport pro' },
];

export function num(v: unknown): number { const n = parseFloat(v as string); return isNaN(n) ? 0 : n; }
export function round1(x: number): number { return Math.round(x * 10) / 10; }

export function migrateAct(k: string): string {
  const m: Record<string, string> = { sed: '1.20', act: '1.40', sup: '1.60', '1.55': '1.50', '1.70': '1.75', '1.90': '2.00' };
  return m[k] || k;
}

export function actFactor(k: string): number {
  const OLD: Record<string, number> = { sed: 1.20, act: 1.40, sup: 1.60 };
  if (k in OLD) return OLD[k];
  const f = parseFloat(k);
  return isFinite(f) ? f : 1.2;
}

export function calcBMR(profile: any): number {
  const w = num(profile.weight), h = num(profile.height), a = num(profile.age);
  if (!w || !h || !a) return 0;
  const bf = num(profile.bf);
  if (bf > 0) {
    const lbm = w * (1 - bf / 100);
    return Math.round(370 + 21.6 * lbm);
  }
  if (profile.sex === 'f') return Math.round(10 * w + 6.25 * h - 5 * a - 161);
  return Math.round(10 * w + 6.25 * h - 5 * a + 5);
}

export function dailySportEstimate(profile: any): number {
  // 1 h de sport = 500 kcal, réparti sur les 7 jours de la semaine
  const h = num(profile.sportHours);
  if (!h) return 0;
  return Math.round((h * 500) / 7);
}

export function calcTDEE(profile: any): number {
  const bmr = calcBMR(profile);
  if (!bmr) return 0;
  const act = migrateAct(profile.act || '1.30');
  return Math.round(bmr * actFactor(act) + dailySportEstimate(profile));
}

export const DEFICIT_PCT = 0.20;

export function deficitFor(tdee: number, sex: string): number {
  const minIntake = sex === 'f' ? 1200 : 1500;
  const maxDef = tdee - minIntake;
  return Math.min(Math.round(tdee * DEFICIT_PCT), Math.max(0, maxDef));
}

export function targetIntake(profile: any): number {
  const tdee = calcTDEE(profile);
  if (!tdee) return 0;
  const deficit = deficitFor(tdee, profile.sex || 'h');
  return tdee - deficit;
}

export function goalCalc(profile: any): { kcalToLose: number; rate: number; goalWeight: number } | null {
  const w = num(profile.weight);
  if (!w) return null;
  const tdee = calcTDEE(profile);
  if (!tdee) return null;
  const sex = profile.sex || 'h';
  const deficit = deficitFor(tdee, sex);
  let goalW = 0;
  if (profile.goalMode === 'bf') {
    const bft = num(profile.bft), bf = num(profile.bf);
    if (bft > 0 && bf > 0) goalW = w * (1 - bf / 100) / (1 - bft / 100);
  } else {
    goalW = num(profile.goalWeight);
  }
  if (!goalW || goalW >= w) return null;
  return { kcalToLose: (w - goalW) * 7700, rate: deficit, goalWeight: goalW };
}

export function dayKcal(day: any): number {
  return (day?.foods ?? []).reduce((s: number, f: any) => s + num(f.k), 0);
}

export function dayExpend(day: any, profile: any): number {
  const bmr = calcBMR(profile);
  const act = migrateAct(day?.act || profile?.act || '1.30');
  const base = bmr ? Math.round(bmr * actFactor(act)) : 0;
  return base + dailySportEstimate(profile);
}

export function dstr(d: Date): string {
  return String(d.getDate()).padStart(2,'0') + '/' +
         String(d.getMonth()+1).padStart(2,'0') + '/' +
         d.getFullYear();
}

export function parseDS(ds: string): Date {
  const p = ds.split('/').map(Number);
  return new Date(p[2], p[1]-1, p[0]);
}

const WD = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const MO = ['jan','fév','mar','avr','mai','juin','juil','aoû','sep','oct','nov','déc'];

export function frDate(ds: string): string {
  const d = parseDS(ds);
  return WD[d.getDay()] + ' ' + d.getDate() + ' ' + MO[d.getMonth()];
}

export function frShort(d: Date): string {
  return d.getDate() + ' ' + MO[d.getMonth()] + ' ' + d.getFullYear();
}
