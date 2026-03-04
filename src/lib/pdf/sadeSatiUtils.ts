import { SIGNS } from './astroData';
import { localizePdfUiText } from './localization';

export type SadeSatiPhaseKey = 'rising' | 'peak' | 'setting' | 'not_active';

export const normalizeSadeSatiPhase = (raw: unknown): SadeSatiPhaseKey => {
  const text = String(raw || '').toLowerCase();
  if (text.includes('rising') || text.includes('12th')) return 'rising';
  if (text.includes('peak') || text.includes('over moon') || text.includes('1st')) return 'peak';
  if (text.includes('setting') || text.includes('2nd')) return 'setting';
  if (text.includes('not active') || text.includes('not currently active')) return 'not_active';
  return 'not_active';
};

export const computeSadeSatiPhaseFromSigns = (moonSign: string, saturnSign: string): SadeSatiPhaseKey => {
  const moonIdx = SIGNS.indexOf(moonSign);
  const saturnIdx = SIGNS.indexOf(saturnSign);
  if (moonIdx < 0 || saturnIdx < 0) return 'not_active';
  const relative = (saturnIdx - moonIdx + 12) % 12;
  if (relative === 11) return 'rising';
  if (relative === 0) return 'peak';
  if (relative === 1) return 'setting';
  return 'not_active';
};

export const phaseLabel = (phase: SadeSatiPhaseKey): string => {
  if (phase === 'rising') return localizePdfUiText('Rising Phase (12th from Moon)');
  if (phase === 'peak') return localizePdfUiText('Peak Phase (Over Moon)');
  if (phase === 'setting') return localizePdfUiText('Setting Phase (2nd from Moon)');
  return localizePdfUiText('Not Active');
};

export const isSadeSatiDoshaName = (name: unknown, nameHindi?: unknown): boolean => {
  const full = `${String(name || '')} ${String(nameHindi || '')}`.toLowerCase();
  return full.includes('sade sati') || (full.includes('shani') && full.includes('sati'));
};

export const parseYearLike = (value: unknown): number | null => {
  const n = Number(String(value ?? '').match(/\d{4}/)?.[0]);
  return Number.isFinite(n) ? n : null;
};

export const addMonthsUtc = (year: number, monthIndex: number, delta: number): { year: number; monthIndex: number } => {
  const total = year * 12 + monthIndex + delta;
  const y = Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  return { year: y, monthIndex: m };
};
