export type SupportedLanguage = "en" | "hi" | "te" | "kn" | "mr" | "ta" | "gu";

export type LanguageSection =
  | "global"
  | "panchang"
  | "pillars"
  | "planets"
  | "houses"
  | "career"
  | "marriage"
  | "dasha"
  | "rahuKetu"
  | "remedies"
  | "numerology"
  | "spiritual"
  | "charaKarakas"
  | "glossary"
  | "doshas"
  | "rajYogs"
  | "sadeSati"
  | "qa";

export interface LanguagePromptDirective {
  systemPrefix: string;
  userPrefix?: string;
}

export interface LanguageQcRules {
  minScriptChars: number;
  minScriptRatio: number;
  maxLatinRatio: number;
  bannedTokens: string[];
  allowedLatinTokens: string[];
}

export interface LanguageTypographyProfile {
  bodyFontFamily: string;
  bodyFontSize: number;
  bodyLineHeight: number;
  tableFontSize: number;
  tableLineHeight: number;
}

export interface PlanetSignification {
  themes: string;
  opportunity: string;
  caution: string;
}

export interface LanguagePack {
  code: SupportedLanguage;
  version: string;
  generationMode: "native";
  agentPrompts: Partial<Record<LanguageSection, LanguagePromptDirective>>;
  staticLabels: Record<string, string>;
  termMaps: {
    planets: Record<string, string>;
    signs: Record<string, string>;
    weekdays: Record<string, string>;
    houses: Record<string, string>;
    nakshatras?: Record<string, string>;
    months?: Record<string, string>;
    misc?: Record<string, string>;
  };
  /** Keyed template strings with {placeholder} substitution (Phase 2) */
  templates?: Record<string, string>;
  /** Planet signification objects for dasha analysis */
  significations?: {
    planets?: Record<string, PlanetSignification>;
  };
  typography: LanguageTypographyProfile;
  qcRules: LanguageQcRules;
}

export interface LanguageQcSectionResult {
  section: string;
  passed: boolean;
  scriptChars: number;
  totalLetters: number;
  scriptRatio: number;
  latinRatio: number;
  bannedHits: string[];
}

export interface LanguageQcResult {
  language: SupportedLanguage;
  packVersion: string;
  passed: boolean;
  generationMode: "native";
  summary: {
    sectionsChecked: number;
    sectionsPassed: number;
    totalScriptChars: number;
    totalLetters: number;
    overallScriptRatio: number;
    overallLatinRatio: number;
  };
  sections: LanguageQcSectionResult[];
  leakSamples: Array<{ section: string; token: string }>;
}
