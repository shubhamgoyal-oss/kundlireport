import { CHART_LABEL_MAP } from './astroData';

/**
 * Sanitize text to remove control/noise characters while preserving native scripts.
 */
export const sanitizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return String(text)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    // Remove U+25CC (dotted circle placeholder) that Gemini sometimes emits before
    // Indic combining marks like virama (◌् → ्). This prevents visible "◌" artifacts.
    .replace(/\u25CC/g, '')
    // Remove zero-width characters that break Indic word rendering:
    // U+200B (zero-width space), U+FEFF (BOM) — cause Tamil words to appear fragmented.
    .replace(/[\u200B\uFEFF]/g, '')
    // Strip stray HTML-like encoding artifacts ($A2>, &gt;, etc.) from AI output
    .replace(/\$[A-F0-9]{2,4}>/gi, '')
    // Remove garbled ASCII sequences in place of Indic headings (font mapping artifacts)
    .replace(/&[A-Z0-9?$@/]{3,}[\s>-]*/gi, '')
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

/**
 * Split a long text block into 2-3 balanced paragraphs at sentence boundaries.
 * Returns an array of paragraph strings. If the text already contains paragraph
 * breaks (\n\n) or is short enough, returns it as-is (single-element array).
 *
 * Target: 2-3 paragraphs of roughly equal length.
 * Minimum text length to split: 400 characters (~3-4 sentences).
 */
export const splitIntoParagraphs = (text: string | null | undefined, targetParas = 3): string[] => {
  if (!text) return [''];
  const clean = String(text).trim();

  // Already has paragraph breaks — respect them
  if (clean.includes('\n\n')) return clean.split(/\n{2,}/).filter(p => p.trim());

  // Too short to split
  if (clean.length < 400) return [clean];

  // Split into sentences: match ". " followed by uppercase, or "। " (Hindi purna viram)
  const sentences = clean.split(/(?<=\.[\s])\s*(?=[A-Z\u0900-\u0D7F])|(?<=।\s)/).filter(s => s.trim());

  if (sentences.length < 3) return [clean];

  // Determine how many paragraphs (2 or 3) based on content length
  const numParas = sentences.length >= 6 ? Math.min(targetParas, 3) : 2;
  const targetLen = clean.length / numParas;

  const paragraphs: string[] = [];
  let current = '';
  let paraCount = 0;

  for (let i = 0; i < sentences.length; i++) {
    current += sentences[i];
    // Check if we should break here
    const remaining = sentences.length - i - 1;
    const parasLeft = numParas - paraCount - 1;
    if (parasLeft > 0 && remaining >= parasLeft && current.length >= targetLen * 0.7) {
      paragraphs.push(current.trim());
      current = '';
      paraCount++;
    }
  }
  if (current.trim()) paragraphs.push(current.trim());

  return paragraphs.length > 0 ? paragraphs : [clean];
};

/**
 * Remove consecutive duplicate lines/sentences from text.
 * AI sometimes generates the same line twice in a row.
 * Handles both newline-separated and period-separated duplicates.
 */
export const dedupConsecutiveLines = (text: string | null | undefined): string => {
  if (!text) return '';
  const clean = String(text).trim();
  if (!clean) return '';

  // First, dedup newline-separated lines
  const lines = clean.split('\n');
  const dedupedLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (dedupedLines.length === 0 || trimmed !== dedupedLines[dedupedLines.length - 1].trim()) {
      dedupedLines.push(line);
    }
  }
  let result = dedupedLines.join('\n');

  // Second, dedup consecutive identical sentences (period-separated)
  // Only apply if no newlines present (single-paragraph text)
  if (!result.includes('\n') && result.length > 100) {
    const sentences = result.split(/(?<=\.)\s+/);
    const dedupedSentences: string[] = [];
    for (const sent of sentences) {
      const trimSent = sent.trim();
      if (dedupedSentences.length === 0 || trimSent !== dedupedSentences[dedupedSentences.length - 1].trim()) {
        dedupedSentences.push(sent);
      }
    }
    result = dedupedSentences.join(' ');
  }

  return result;
};

export const normalizeChartLabel = (raw: string): string => {
  const text = String(raw || "").trim();
  if (!text) return "";
  if (CHART_LABEL_MAP[text]) return CHART_LABEL_MAP[text];
  return sanitizeText(text);
};
