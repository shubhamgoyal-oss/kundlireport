import { CHART_LABEL_MAP } from './astroData';

/**
 * Sanitize text to remove control/noise characters while preserving native scripts.
 */
export const sanitizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return String(text)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    // Convert literal escaped newlines from backend (\\n → real \n)
    .replace(/\\n/g, '\n')
    .replace(/\s+,/g, ',')
    .replace(/\(\s*\)/g, '')
    // Collapse whitespace BUT preserve newlines (\n) — they are inserted by
    // preWrapReportTexts() to prevent Indic word-breaking in PDFs.
    .replace(/[^\S\n]+/g, ' ')
    .trim();
};

/**
 * Strip all non-Latin/non-ASCII script characters (Devanagari, Telugu, Kannada, Tamil, etc.)
 * Use this when the active PDF font cannot render Indic scripts (e.g., English NotoSans).
 */
export const stripIndicChars = (text: string | null | undefined): string => {
  if (!text) return '';
  return String(text)
    // Remove Devanagari (U+0900–U+097F), Telugu (U+0C00–U+0C7F),
    // Kannada (U+0C80–U+0CFF), Tamil (U+0B80–U+0BFF), Bengali (U+0980–U+09FF),
    // Gujarati (U+0A80–U+0AFF), Gurmukhi (U+0A00–U+0A7F), Oriya (U+0B00–U+0B7F),
    // Malayalam (U+0D00–U+0D7F), Vedic Extensions (U+1CD0–U+1CFF)
    .replace(/[\u0900-\u0D7F\u1CD0-\u1CFF]/g, '')
    .replace(/\(\s*\)/g, '')  // Clean up empty parentheses left behind
    .replace(/\s+/g, ' ')
    .trim();
};

export const normalizeChartLabel = (raw: string): string => {
  const text = String(raw || "").trim();
  if (!text) return "";
  if (CHART_LABEL_MAP[text]) return CHART_LABEL_MAP[text];
  return sanitizeText(text);
};
