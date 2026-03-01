import { getLanguagePack, normalizeLanguage } from "./language-packs/index.ts";

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function localizeText(text: string, replacements: Array<{ from: string; to: string }>): string {
  let out = text;
  for (const { from, to } of replacements) {
    const re = new RegExp(`\\b${escapeRegex(from)}\\b`, "gi");
    out = out.replace(re, to);
  }
  return out;
}

function removeNoise(value: string): string {
  return value
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+([,.;:!?।॥])/g, "$1")
    .trim();
}

const LOCALIZATION_SKIP_KEYS = new Set([
  "language",
  "generationMode",
  "languagePackVersion",
  "failureCode",
  "generation_language_mode",
  "language_qc",
  "report_data",
  "visitorId",
  "sessionId",
  "jobId",
]);

function shouldSkipLocalizationForValue(value: string, parentKey?: string): boolean {
  if (parentKey && LOCALIZATION_SKIP_KEYS.has(parentKey)) return true;
  if (!value) return false;
  const text = value.trim();
  // Preserve technical/date/time values and offsets.
  if (/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(text)) return true;
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) return true;
  if (/^UTC[+-]\d{2}:\d{2}$/i.test(text)) return true;
  if (/^[A-Z]{2,5}([_-][A-Z0-9]{2,5})?$/.test(text)) return true;
  return false;
}

function normalizeEnding(value: string, language: "en" | "hi" | "te"): string {
  if (!value || value.length < 40) return value;
  if (/[।॥.!?]\s*$/.test(value)) return value;
  if (language === "en") return `${value}.`;
  return `${value}।`;
}

function replaceCommonLatin(value: string, language: "en" | "hi" | "te"): string {
  if (language === "en") return value;
  const hiMap: Array<[RegExp, string]> = [
    [/\bhigh\b/gi, "उच्च"],
    [/\bmedium\b/gi, "मध्यम"],
    [/\blow\b/gi, "कम"],
    [/\bnone\b/gi, "नहीं"],
    [/\bpresent\b/gi, "उपस्थित"],
    [/\babsent\b/gi, "अनुपस्थित"],
    [/\bnullified\b/gi, "निरस्त"],
    [/\bpartial\b/gi, "आंशिक"],
    [/\bstrong\b/gi, "मजबूत"],
    [/\bmoderate\b/gi, "मध्यम"],
    [/\bweak\b/gi, "कमज़ोर"],
    [/\bactive\b/gi, "सक्रिय"],
    [/\bphase\b/gi, "चरण"],
    [/\bperiod\b/gi, "अवधि"],
    [/\byears?\b/gi, "वर्ष"],
    [/\bmonths?\b/gi, "महीने"],
    [/\bhouse\b/gi, "भाव"],
    [/\bsign\b/gi, "राशि"],
    [/\bplanet\b/gi, "ग्रह"],
    [/\bdosha\b/gi, "दोष"],
    [/\byoga\b/gi, "योग"],
    [/\bdasha\b/gi, "दशा"],
    [/\bnative\b/gi, "जातक"],
    [/\bmale\b/gi, "पुरुष"],
    [/\bfemale\b/gi, "महिला"],
    [/\byoung\b/gi, "युवा"],
    [/\badult\b/gi, "वयस्क"],
    [/\bsenior\b/gi, "वरिष्ठ"],
    [/\bminor\b/gi, "अल्पवय"],
    [/\bprevious\b/gi, "पूर्व"],
    [/\bcycle\b/gi, "चक्र"],
    [/\bspouse\b/gi, "जीवनसाथी"],
    [/\bpartner\b/gi, "साथी"],
    [/\bhealth\b/gi, "स्वास्थ्य"],
    [/\bcareer\b/gi, "कैरियर"],
    [/\bmarriage\b/gi, "विवाह"],
    [/\bguidance\b/gi, "मार्गदर्शन"],
    [/\banalysis\b/gi, "विश्लेषण"],
    [/\bremedy\b/gi, "उपाय"],
    [/\bSiddha\b/g, "सिद्ध"],
    [/\bMangala\b/g, "मंगला"],
    [/\bPingala\b/g, "पिंगला"],
    [/\bDhanya\b/g, "धन्या"],
    [/\bBhramari\b/g, "भ्रमरी"],
    [/\bBhadrika\b/g, "भद्रिका"],
    [/\bUlka\b/g, "उल्का"],
    [/\bSankata\b/g, "संकटा"],
  ];
  const teMap: Array<[RegExp, string]> = [
    [/\bhigh\b/gi, "అధిక"],
    [/\bmedium\b/gi, "మధ్యస్థ"],
    [/\blow\b/gi, "తక్కువ"],
    [/\bnone\b/gi, "లేదు"],
    [/\bpresent\b/gi, "ఉంది"],
    [/\babsent\b/gi, "లేదు"],
    [/\bnullified\b/gi, "నిరాకరించబడింది"],
    [/\bpartial\b/gi, "ఆంశికం"],
    [/\bstrong\b/gi, "బలమైన"],
    [/\bmoderate\b/gi, "మధ్యస్థ"],
    [/\bweak\b/gi, "బలహీన"],
    [/\bactive\b/gi, "సక్రియ"],
    [/\bphase\b/gi, "దశ"],
    [/\bperiod\b/gi, "కాలం"],
    [/\byears?\b/gi, "సంవత్సరాలు"],
    [/\bmonths?\b/gi, "నెలలు"],
    [/\bhouse\b/gi, "భావం"],
    [/\bsign\b/gi, "రాశి"],
    [/\bplanet\b/gi, "గ్రహం"],
    [/\bdosha\b/gi, "దోషం"],
    [/\byoga\b/gi, "యోగం"],
    [/\bdasha\b/gi, "దశ"],
    [/\bnative\b/gi, "జాతకుడు"],
    [/\bmale\b/gi, "పురుషుడు"],
    [/\bfemale\b/gi, "మహిళ"],
    [/\byoung\b/gi, "యువ"],
    [/\badult\b/gi, "వయోజన"],
    [/\bsenior\b/gi, "వృద్ధ"],
    [/\bminor\b/gi, "అల్పవయస్కుడు"],
    [/\bprevious\b/gi, "గత"],
    [/\bcycle\b/gi, "చక్రం"],
    [/\bspouse\b/gi, "జీవిత భాగస్వామి"],
    [/\bpartner\b/gi, "భాగస్వామి"],
    [/\bhealth\b/gi, "ఆరోగ్యం"],
    [/\bcareer\b/gi, "వృత్తి"],
    [/\bmarriage\b/gi, "వివాహం"],
    [/\bguidance\b/gi, "మార్గదర్శకం"],
    [/\banalysis\b/gi, "విశ్లేషణ"],
    [/\bremedy\b/gi, "పరిహారం"],
    [/\bSiddha\b/g, "సిద్ధ"],
    [/\bMangala\b/g, "మంగళ"],
    [/\bPingala\b/g, "పింగళ"],
    [/\bDhanya\b/g, "ధన్య"],
    [/\bBhramari\b/g, "భ్రమరి"],
    [/\bBhadrika\b/g, "భద్రికా"],
    [/\bUlka\b/g, "ఉల్కా"],
    [/\bSankata\b/g, "సంకటా"],
  ];

  let out = value;
  const rules = language === "hi" ? hiMap : teMap;
  for (const [re, to] of rules) {
    out = out.replace(re, to);
  }
  const allowlist = new Set(["API", "PDF", "UTC", "AM", "PM", "IST"]);
  out = out.replace(/\b([A-Za-z]{2,})\b/g, (token) => (allowlist.has(token.toUpperCase()) ? token : ""));
  out = out.replace(/[ \t]{2,}/g, " ").trim();
  return out;
}

function walk(
  value: unknown,
  replacements: Array<{ from: string; to: string }>,
  language: "en" | "hi" | "te",
  parentKey?: string,
): unknown {
  if (typeof value === "string") {
    if (shouldSkipLocalizationForValue(value, parentKey)) return value;
    const localized = localizeText(value, replacements);
    const withCommon = replaceCommonLatin(localized, language);
    const cleaned = removeNoise(withCommon);
    return normalizeEnding(cleaned, language);
  }
  if (Array.isArray(value)) {
    return value.map((item) => walk(item, replacements, language, parentKey));
  }
  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      output[k] = walk(v, replacements, language, k);
    }
    return output;
  }
  return value;
}

export function localizeStructuredReportTerms<T>(report: T, language: unknown): T {
  const normalized = normalizeLanguage(language);
  if (normalized === "en") return report;

  const pack = getLanguagePack(normalized);
  const replacements: Array<{ from: string; to: string }> = [];
  const maps = [
    pack.termMaps.misc || {},
    pack.termMaps.months || {},
    pack.termMaps.nakshatras || {},
    pack.termMaps.planets,
    pack.termMaps.signs,
    pack.termMaps.weekdays,
    pack.termMaps.houses,
  ];

  for (const map of maps) {
    for (const [from, to] of Object.entries(map)) {
      replacements.push({ from, to });
    }
  }

  // Replace longer phrases first to avoid partial substitutions.
  replacements.sort((a, b) => b.from.length - a.from.length);

  return walk(report, replacements, normalized) as T;
}
