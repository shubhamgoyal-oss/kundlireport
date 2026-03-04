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

export const normalizeChartLabel = (raw: string): string => {
  const text = String(raw || "").trim();
  if (!text) return "";
  if (CHART_LABEL_MAP[text]) return CHART_LABEL_MAP[text];
  return sanitizeText(text);
};
