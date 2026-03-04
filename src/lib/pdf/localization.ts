import { wrapIndicSync } from '@/utils/preWrapText';
import { PDF_UI_PHRASE_MAP } from './i18n/phrases';
import { PDF_UI_WORD_MAP } from './i18n/words';
import { sanitizeText, stripIndicChars } from './textUtils';
import type { PdfLanguage } from './types';

// ── Module-level globals for PDF rendering ──────────────────────────────────
// These are set once per render by applyLanguageTypography() and read by all
// localization/formatting functions. The BulkKundliRunner mutex prevents
// concurrent PDF renders, so there are no race conditions.

let ACTIVE_PDF_FONT_FAMILY = 'NotoSans';
let ACTIVE_PDF_BODY_FONT_SIZE = 10.5;
let ACTIVE_PDF_BODY_LINE_HEIGHT = 1.45;
let ACTIVE_PDF_LANGUAGE: PdfLanguage = 'en';

// ── Getters ─────────────────────────────────────────────────────────────────
export const getActivePdfLanguage = (): PdfLanguage => ACTIVE_PDF_LANGUAGE;
export const getActivePdfFontFamily = (): string => ACTIVE_PDF_FONT_FAMILY;
export const getActivePdfBodyFontSize = (): number => ACTIVE_PDF_BODY_FONT_SIZE;
export const getActivePdfBodyLineHeight = (): number => ACTIVE_PDF_BODY_LINE_HEIGHT;

/**
 * Configure module-level typography globals for a given language.
 * Must be called once at the start of each PDF render.
 */
export const applyLanguageTypography = (language: string | null | undefined) => {
  const code = String(language || 'en').toLowerCase();
  if (code.startsWith('hi')) {
    ACTIVE_PDF_LANGUAGE = 'hi';
    // GPOS/GDEF tables stripped from NotoSansDevanagari via fonttools to fix fontkit null-anchor crash.
    ACTIVE_PDF_FONT_FAMILY = 'NotoSansDevanagari';
    ACTIVE_PDF_BODY_FONT_SIZE = 11.2;
    ACTIVE_PDF_BODY_LINE_HEIGHT = 1.62;
    return;
  }
  if (code.startsWith('te')) {
    ACTIVE_PDF_LANGUAGE = 'te';
    // GPOS/GDEF tables stripped from NotoSansTelugu via fonttools to fix fontkit null-anchor crash.
    ACTIVE_PDF_FONT_FAMILY = 'NotoSansTelugu';
    ACTIVE_PDF_BODY_FONT_SIZE = 11.2;
    ACTIVE_PDF_BODY_LINE_HEIGHT = 1.62;
    return;
  }
  if (code.startsWith('kn') || code.startsWith('kan')) {
    ACTIVE_PDF_LANGUAGE = 'kn';
    // NotoSansKannada — GPOS+GDEF tables stripped (same fix as Hindi/Telugu) to prevent broken rendering.
    ACTIVE_PDF_FONT_FAMILY = 'NotoSansKannada';
    ACTIVE_PDF_BODY_FONT_SIZE = 11.2;
    ACTIVE_PDF_BODY_LINE_HEIGHT = 1.62;
    return;
  }
  if (code.startsWith('mr') || code.startsWith('mar')) {
    ACTIVE_PDF_LANGUAGE = 'mr';
    // Marathi uses Devanagari script — same font as Hindi.
    ACTIVE_PDF_FONT_FAMILY = 'NotoSansDevanagari';
    ACTIVE_PDF_BODY_FONT_SIZE = 11.2;
    ACTIVE_PDF_BODY_LINE_HEIGHT = 1.62;
    return;
  }
  if (code.startsWith('ta') || code.startsWith('tam')) {
    ACTIVE_PDF_LANGUAGE = 'ta';
    ACTIVE_PDF_FONT_FAMILY = 'NotoSansTamil';
    ACTIVE_PDF_BODY_FONT_SIZE = 11.2;
    ACTIVE_PDF_BODY_LINE_HEIGHT = 1.62;
    return;
  }
  ACTIVE_PDF_LANGUAGE = 'en';
  ACTIVE_PDF_FONT_FAMILY = 'NotoSans';
  ACTIVE_PDF_BODY_FONT_SIZE = 10.5;
  ACTIVE_PDF_BODY_LINE_HEIGHT = 1.45;
};

/**
 * Translate English UI text to the active PDF language.
 * Uses phrase-level matching first, then word-level replacement.
 * Optionally pre-wraps for Indic scripts to prevent mid-word breaks.
 */
export const localizePdfUiText = (raw: string | null | undefined, maxWidthPt?: number): string => {
  const input = sanitizeText(String(raw || ''));
  // English PDFs use NotoSans which cannot render Devanagari/Indic scripts.
  // Strip ALL Indic characters to prevent gibberish like ()**#M!2@
  if (!input || ACTIVE_PDF_LANGUAGE === 'en') return stripIndicChars(input);

  const phraseMap = PDF_UI_PHRASE_MAP[ACTIVE_PDF_LANGUAGE] || {};
  const wordMap = PDF_UI_WORD_MAP[ACTIVE_PDF_LANGUAGE] || {};

  if (phraseMap[input]) return phraseMap[input];

  let output = input;

  // ── Step 1: Strip parenthetical English from backend data ────────────────
  output = output.replace(/\s*\(([^)]*)\)/g, (_match, inner: string) => {
    const letters = inner.replace(/[\s\d\p{P}\p{S}]/gu, '');
    if (letters.length === 0) return _match;
    const latinChars = (letters.match(/[A-Za-z]/g) || []).length;
    if (latinChars / letters.length > 0.4) return '';
    return _match;
  });

  // ── Step 2: Phrase-level replacements (sorted longest first) ─────────────
  const phraseEntries = Object.entries(phraseMap).sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of phraseEntries) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const startBound = /^\w/.test(from) ? '\\b' : '';
    const endBound = /\w$/.test(from) ? '\\b' : '';
    const re = new RegExp(`${startBound}${escaped}${endBound}`, 'gi');
    output = output.replace(re, to);
  }

  // ── Step 3: Word-level replacements ──────────────────────────────────────
  for (const [from, to] of Object.entries(wordMap)) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'gi');
    output = output.replace(re, to);
  }

  // ── Step 3.5: Final Latin-word sweep ────────────────────────────────────
  if (output.length > 10) {
    const letters = output.replace(/[\s\d\p{P}\p{S}]/gu, '');
    if (letters.length > 0) {
      const latinCount = (letters.match(/[A-Za-z]/g) || []).length;
      if (latinCount > 0 && latinCount / letters.length < 0.4) {
        const cleaned = output.replace(/\b[A-Za-z]{3,}\b/g, '');
        if (cleaned.replace(/[\s\p{P}\p{S}\d]/gu, '').length > 0) {
          output = cleaned;
        }
      }
    }
  }

  // ── Step 4: Cleanup ───────────────────────────────────────────────────────
  output = output.replace(/\s*-\s*,/g, ',');
  output = output.replace(/[^\S\n]{2,}/g, ' ').trim();
  output = output.replace(/^[,\s]+|[,\s]+$/g, '');

  // ── Step 5: Pre-wrap for Indic scripts ──────────────────────────────────
  return wrapIndicSync(output, ACTIVE_PDF_LANGUAGE, maxWidthPt);
};
