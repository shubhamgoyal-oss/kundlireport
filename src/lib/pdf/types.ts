export type PdfLanguage = 'en' | 'hi' | 'te' | 'kn' | 'mr' | 'ta' | 'gu';

export interface ChartData {
  type: string;
  name: string;
  nameHindi: string;
  nameTelugu?: string;
  nameKannada?: string;
  nameMarathi?: string;
  nameTamil?: string;
  nameGujarati?: string;
  purpose: string;
  svg: string;
  dataUrl?: string | null;
}

export interface KundliPDFProps {
  report: any; // Full KundliReport type
  /** Explicit language override — use this in bulk mode to avoid global-state races */
  language?: PdfLanguage;
}
