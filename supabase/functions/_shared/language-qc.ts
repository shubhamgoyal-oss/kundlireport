import { getLanguagePack, normalizeLanguage } from "./language-packs/index.ts";
import type { LanguagePack, LanguageQcResult, LanguageQcSectionResult, SupportedLanguage } from "./language-packs/types.ts";

const DEVANAGARI_RE = /[\u0900-\u097F]/g;
const TELUGU_RE = /[\u0C00-\u0C7F]/g;
const LATIN_RE = /[A-Za-z]/g;

function countMatches(text: string, re: RegExp): number {
  const m = text.match(re);
  return m ? m.length : 0;
}

function isNarrativePath(path: string[]): boolean {
  const joined = path.join(".");
  return /(overview|interpretation|prediction|analysis|guidance|advice|impact|description|summary|recommendation|focus|challenge|opportunit|timing|rationale|plan|insight|narrative|currentPhase|health|career|marriage|financial|spiritual)/i
    .test(joined);
}

function collectNarrativeText(value: unknown, path: string[] = []): string[] {
  if (value == null) return [];
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];
    if (isNarrativePath(path) || text.length >= 120) {
      return [text];
    }
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectNarrativeText(item, [...path, String(index)]));
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.entries(obj).flatMap(([k, v]) => collectNarrativeText(v, [...path, k]));
  }
  return [];
}

function tokenizeBanned(text: string, pack: LanguagePack): string[] {
  if (pack.code === "en") return [];
  const lower = text.toLowerCase();
  const hits: string[] = [];
  for (const token of pack.qcRules.bannedTokens) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "i");
    if (re.test(lower)) {
      const allowed = pack.qcRules.allowedLatinTokens.some((allow) => allow.toLowerCase() === token.toLowerCase());
      if (!allowed) hits.push(token);
    }
  }
  return hits;
}

function getScriptCounts(text: string, language: SupportedLanguage): { scriptChars: number; latinChars: number; totalLetters: number } {
  const latinChars = countMatches(text, LATIN_RE);
  if (language === "en") {
    return {
      scriptChars: latinChars,
      latinChars,
      totalLetters: latinChars,
    };
  }

  const scriptChars = language === "hi"
    ? countMatches(text, DEVANAGARI_RE)
    : countMatches(text, TELUGU_RE);

  const totalLetters = scriptChars + latinChars;
  return { scriptChars, latinChars, totalLetters };
}

function evaluateSection(section: string, text: string, language: SupportedLanguage, pack: LanguagePack): LanguageQcSectionResult {
  const { scriptChars, latinChars, totalLetters } = getScriptCounts(text, language);
  const scriptRatio = totalLetters > 0 ? scriptChars / totalLetters : 1;
  const latinRatio = totalLetters > 0 ? latinChars / totalLetters : 0;
  const bannedHits = tokenizeBanned(text, pack);

  if (language === "en") {
    return {
      section,
      passed: true,
      scriptChars,
      totalLetters,
      scriptRatio,
      latinRatio,
      bannedHits,
    };
  }

  const substantial = text.length >= 80;
  const scriptPassed = !substantial
    || (scriptChars >= pack.qcRules.minScriptChars
      && scriptRatio >= pack.qcRules.minScriptRatio
      && latinRatio <= pack.qcRules.maxLatinRatio);
  const bannedPassed = bannedHits.length === 0;

  return {
    section,
    passed: scriptPassed && bannedPassed,
    scriptChars,
    totalLetters,
    scriptRatio,
    latinRatio,
    bannedHits,
  };
}

const EXCLUDED_TOP_LEVEL_KEYS = new Set([
  "qa",
  "errors",
  "tokensUsed",
  "generatedAt",
  "language",
  "seerRawResponse",
  "seerRequest",
  "computationMeta",
]);

export function runLanguageQc(report: Record<string, unknown>, requestedLanguage: unknown): LanguageQcResult {
  const language = normalizeLanguage(requestedLanguage);
  const pack = getLanguagePack(language);

  const sections: LanguageQcSectionResult[] = [];
  for (const [key, value] of Object.entries(report || {})) {
    if (EXCLUDED_TOP_LEVEL_KEYS.has(key)) continue;
    const textBlocks = collectNarrativeText(value, [key]);
    if (textBlocks.length === 0) continue;
    const joined = textBlocks.join("\n");
    sections.push(evaluateSection(key, joined, language, pack));
  }

  if (sections.length === 0) {
    return {
      language,
      packVersion: pack.version,
      generationMode: pack.generationMode,
      passed: language === "en",
      summary: {
        sectionsChecked: 0,
        sectionsPassed: 0,
        totalScriptChars: 0,
        totalLetters: 0,
        overallScriptRatio: language === "en" ? 1 : 0,
        overallLatinRatio: 0,
      },
      sections,
      leakSamples: language === "en" ? [] : [{ section: "report", token: "No narrative sections found for language QC" }],
    };
  }

  const sectionsPassed = sections.filter((s) => s.passed).length;
  const totalScriptChars = sections.reduce((acc, s) => acc + s.scriptChars, 0);
  const totalLetters = sections.reduce((acc, s) => acc + s.totalLetters, 0);
  const totalLatinChars = sections.reduce((acc, s) => acc + (s.totalLetters * s.latinRatio), 0);

  const leakSamples = sections
    .filter((s) => s.bannedHits.length > 0)
    .flatMap((s) => s.bannedHits.map((token) => ({ section: s.section, token })))
    .slice(0, 25);

  const passed = language === "en" ? true : sectionsPassed === sections.length && leakSamples.length === 0;

  return {
    language,
    packVersion: pack.version,
    generationMode: pack.generationMode,
    passed,
    summary: {
      sectionsChecked: sections.length,
      sectionsPassed,
      totalScriptChars,
      totalLetters,
      overallScriptRatio: totalLetters > 0 ? totalScriptChars / totalLetters : 0,
      overallLatinRatio: totalLetters > 0 ? totalLatinChars / totalLetters : 0,
    },
    sections,
    leakSamples,
  };
}
