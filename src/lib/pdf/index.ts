// Barrel re-exports for PDF rendering modules
// Font registration must happen before any PDF rendering
import './fontSetup';

export { P, SRIMANDIR_ORANGE, BRAND_HEADER_DARK, SRI_MANDIR_LOGO_URI } from './colors';
export type { PdfLanguage, ChartData, KundliPDFProps } from './types';
export {
  SIGN_TO_INDEX, SIGN_SHORT, SIGN_LORDS,
  NAKSHATRA_SPAN, NAKSHATRA_PADA_SPAN, NAKSHATRAS,
  DASHA_ORDER, DASHA_YEARS,
  CHART_LABEL_MAP, SATURN_TRANSIT_FALLBACK_SIGN, SIGNS,
} from './astroData';
export { sanitizeText, normalizeChartLabel } from './textUtils';
export {
  getActivePdfLanguage, getActivePdfFontFamily,
  getActivePdfBodyFontSize, getActivePdfBodyLineHeight,
  applyLanguageTypography, localizePdfUiText,
} from './localization';
export { formatBirthDate, formatDate, formatMonthYear, formatCoordinate, getWeekday } from './formatters';
export {
  normalizeSadeSatiPhase, computeSadeSatiPhaseFromSigns,
  phaseLabel, isSadeSatiDoshaName, parseYearLike, addMonthsUtc,
} from './sadeSatiUtils';
export type { SadeSatiPhaseKey } from './sadeSatiUtils';
export { translitPlace, parsePlaceDetails } from './placeUtils';

// Re-export wrapIndicSync for use in KundliPDFDocument.tsx (disclaimer/guidance sections)
export { wrapIndicSync } from '@/utils/preWrapText';

// i18n data (rarely imported directly — used by localization.ts)
export { PDF_UI_PHRASE_MAP } from './i18n/phrases';
export { PDF_UI_WORD_MAP } from './i18n/words';
export { MONTH_NAMES_BY_LANGUAGE, PLACE_TRANSLIT } from './i18n/placeNames';
export { DISCLAIMER_CONTENT, GUIDANCE_CONTENT } from './i18n/legalContent';
