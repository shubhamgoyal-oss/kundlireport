import { MONTH_NAMES_BY_LANGUAGE } from './i18n/placeNames';
import { getActivePdfLanguage } from './localization';
import type { PdfLanguage } from './types';

/**
 * Format a YYYY-MM-DD date string for display in the PDF.
 * Parses directly without Date constructor to avoid timezone shifts.
 */
export const formatBirthDate = (dateStr: string): string => {
  if (!dateStr) return '';
  // Strip any surrounding quotes that may come from CSV/database values
  const cleanDate = String(dateStr).trim().replace(/^["']+|["']+$/g, '').trim();
  if (!cleanDate) return '';
  const lang = getActivePdfLanguage();
  const months = MONTH_NAMES_BY_LANGUAGE[lang] || MONTH_NAMES_BY_LANGUAGE.en;

  // Handle YYYY-MM-DD strings directly without Date constructor to avoid timezone shifts
  // Also handle YYYY-M-D (no zero-padding)
  const isoMatch = cleanDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ]|$)/);
  if (isoMatch) {
    let y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    // Guard against truncated years: "0200" → 200, "0020" → 20, etc.
    // Fix: any year < 100 is treated as 2-digit shorthand; years 100-1899 are also suspicious
    // for birth dates and likely a zero-padded truncation (e.g., 0200 = really 2000)
    if (y > 0 && y < 100) y += y > 50 ? 1900 : 2000;
    if (y >= 100 && y < 1900) {
      // Year like 200, 201, 300 — likely a truncated modern year
      // Try to recover: if last 2 digits make sense as a 2-digit year, use that
      const twoDigit = y % 100;
      y = twoDigit > 50 ? 1900 + twoDigit : 2000 + twoDigit;
    }
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      // Trailing ZWS prevents @react-pdf from clipping last digit in Indic fonts
      return lang === 'en' ? `${d} ${months[m - 1]} ${y}` : `${d} ${months[m - 1]} ${y}\u200B`;
    }
  }

  // Try Date constructor for other formats
  const date = new Date(cleanDate);
  if (Number.isNaN(date.getTime())) return cleanDate;

  let y = date.getUTCFullYear();
  // Guard: JavaScript Date treats 2-digit years as 1900+yy — fix to 2000+yy for 0-50
  if (y >= 1900 && y < 1950 && cleanDate.match(/\b\d{1,2}\b/) && !cleanDate.match(/\b19\d{2}\b/)) {
    // The original date string has no 4-digit 19xx year, so the 2-digit year was
    // likely meant as 2000+yy, not 1900+yy. Re-map.
    y = y - 1900 + 2000;
  }

  if (lang === 'en') {
    // For English, if the year was corrected, we need to build manually
    if (y !== date.getUTCFullYear()) {
      const engMonths = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      return `${date.getUTCDate()} ${engMonths[date.getUTCMonth()]} ${y}`;
    }
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${y}\u200B`;
};

/**
 * Format a Date object for general display (e.g., dasha periods).
 */
export const formatDate = (date: Date): string => {
  if (Number.isNaN(date.getTime())) return 'N/A';
  const lang = getActivePdfLanguage();
  if (lang === 'en') {
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  const months = MONTH_NAMES_BY_LANGUAGE[lang] || MONTH_NAMES_BY_LANGUAGE.en;
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}\u200B`;
};

/**
 * Format a Date object showing only month and year.
 */
export const formatMonthYear = (date: Date): string => {
  const lang = getActivePdfLanguage();
  if (lang === 'en') {
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }
  const months = MONTH_NAMES_BY_LANGUAGE[lang] || MONTH_NAMES_BY_LANGUAGE.en;
  return `${months[date.getMonth()]} ${date.getFullYear()}\u200B`;
};

/**
 * Format latitude or longitude for display with translated cardinal directions.
 */
export const formatCoordinate = (value: unknown, axis: 'lat' | 'lon'): string => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 'N/A';
  const abs = Math.abs(n).toFixed(4);
  const lang = getActivePdfLanguage();
  const dirMap: Record<string, Record<string, string>> = {
    hi: { North: 'उत्तर', South: 'दक्षिण', East: 'पूर्व', West: 'पश्चिम' },
    te: { North: 'ఉత్తరం', South: 'దక్షిణం', East: 'తూర్పు', West: 'పడమర' },
    kn: { North: 'ಉತ್ತರ', South: 'ದಕ್ಷಿಣ', East: 'ಪೂರ್ವ', West: 'ಪಶ್ಚಿಮ' },
    mr: { North: 'उत्तर', South: 'दक्षिण', East: 'पूर्व', West: 'पश्चिम' },
    ta: { North: 'வடக்கு', South: 'தெற்கு', East: 'கிழக்கு', West: 'மேற்கு' },
  };
  const dir = (key: string) => dirMap[lang]?.[key] || key;
  if (axis === 'lat') return `${abs}° ${n >= 0 ? dir('North') : dir('South')}`;
  return `${abs}° ${n >= 0 ? dir('East') : dir('West')}`;
};

/**
 * Get localized weekday name for a date string.
 */
export const getWeekday = (dateStr: string): string => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 'N/A';
  const lang = getActivePdfLanguage();
  const localeMap: Record<string, string> = { hi: 'hi-IN', te: 'te-IN', kn: 'kn-IN', mr: 'mr-IN', ta: 'ta-IN' };
  return date.toLocaleDateString(localeMap[lang] || 'en-IN', { weekday: 'long' });
};
