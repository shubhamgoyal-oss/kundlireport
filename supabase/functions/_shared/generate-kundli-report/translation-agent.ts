/**
 * Translation Agent — Final sweep to translate any remaining English text
 * in Hindi/Telugu reports before QC validation.
 *
 * Runs AFTER all content agents + truth guard, BEFORE QC.
 * Walks the entire report JSON, detects English strings, batches them,
 * and sends to Gemini for translation. This makes the system bulletproof
 * against English leakage from AI fallbacks, dynamic labels, or edge cases.
 */

import { callAgent, type AgentResponse } from "./agent-base.ts";

// ── Detection heuristics ────────────────────────────────────────────────────

/** Keys whose values should never be translated */
const SKIP_KEYS = new Set([
  // Metadata / config
  "language", "generationMode", "languagePackVersion", "failureCode",
  "generation_language_mode", "language_qc", "report_data",
  "visitorId", "sessionId", "jobId", "id", "type", "status",
  // Birth details (technical values)
  "latitude", "longitude", "timezone", "dateOfBirth", "timeOfBirth",
  "placeOfBirth", "gender",
  // Time periods
  "startDate", "endDate", "approximatePeriod", "duration",
  // Planetary data (technical)
  "planet", "sign", "house", "degree", "signIdx", "deg",
  "nakshatra", "pada", "lord", "dignity", "speed", "isRetro",
  "name", // planet/yoga names — already handled by term maps
  "nameHindi", "nameTelugu", "purposeHindi", "purposeTelugu",
  // Media
  "chartUrl", "imageUrl", "svgData", "svg",
  // Debug / system
  "errors", "qa", "languageQc", "seerRawResponse", "seerRequest",
  "generatedAt", "createdAt", "updatedAt",
  "computationMeta", "predictionSafety", "interpolation",
  "languagePipeline", "languageQcPassed",
  // Safety meta keys
  "medicalDisclaimer", "statusAssumption", "safeguardPolicy",
  "ageGroup", "whenApplicable",
]);

/** Keys whose values are labels/titles that benefit most from translation */
const PRIORITY_KEYS = new Set([
  "overview", "interpretation", "advice", "description",
  "careerImpact", "relationshipImpact", "healthImpact",
  "financialImpact", "spiritualGrowth", "moonSaturnRelationship",
  "characteristics", "lifeFocus", "briefPrediction",
  "focus", "formation", "benefits", "inYourChart",
  "definition", "meaning", "explanation", "significance",
]);

/** Top-level report keys whose entire subtrees should be skipped */
const SKIP_TOP_LEVEL = new Set([
  "seerRawResponse", "seerRequest", "computationMeta",
  "charts", "qa", "languageQc", "errors",
  "birthDetails", // technical birth info, not prose
  "planetaryPositions", "ascendant", "charaKarakas",
  "aspects", "conjunctions",
]);

/** Check if a string value looks like it needs translation */
function needsTranslation(text: string): boolean {
  if (!text || text.length < 12) return false;

  // Skip technical/date/time values
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return false;
  if (/^\d{1,2}:\d{2}/.test(text)) return false;
  if (/^UTC[+-]/.test(text)) return false;
  if (/^https?:\/\//.test(text)) return false;
  if (/^[A-Z]{2,5}([_-][A-Z0-9]+)?$/.test(text)) return false;
  // Skip if it's just a number like "~14 months"
  if (/^[~≈]?\d+(\.\d+)?\s*(months?|years?|days?)?$/i.test(text)) return false;

  // Count Latin vs non-Latin characters
  const letters = text.replace(/[\s\d\p{P}\p{S}]/gu, "");
  if (letters.length < 5) return false;

  const latinChars = (letters.match(/[A-Za-z]/g) || []).length;
  const latinRatio = latinChars / letters.length;

  // If >35% of letters are Latin, it likely needs translation
  return latinRatio > 0.35;
}

// ── Report walker ───────────────────────────────────────────────────────────

interface TranslationEntry {
  path: string;     // JSON path like "career.overview"
  original: string; // Original English text
}

/** Recursively walk the report and collect strings needing translation */
function collectEnglishStrings(
  obj: unknown,
  path: string,
  results: TranslationEntry[],
  parentKey?: string,
): void {
  if (parentKey && SKIP_KEYS.has(parentKey)) return;

  if (typeof obj === "string") {
    if (needsTranslation(obj)) {
      results.push({ path, original: obj });
    }
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      collectEnglishStrings(item, `${path}[${idx}]`, results, parentKey);
    });
    return;
  }

  if (obj && typeof obj === "object") {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const fullPath = path ? `${path}.${key}` : key;
      // Skip entire top-level subtrees that are technical/debug data
      if (!path && SKIP_TOP_LEVEL.has(key)) continue;
      collectEnglishStrings(value, fullPath, results, key);
    }
  }
}

/** Set a value at a JSON path like "career.overview" or "planets[0].analysis" */
function setAtPath(obj: Record<string, any>, path: string, value: string): void {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let current: any = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (current[key] === undefined || current[key] === null) return;
    current = current[key];
  }
  const lastKey = parts[parts.length - 1];
  if (current && lastKey in current) {
    current[lastKey] = value;
  }
}

// ── Translation via Gemini ──────────────────────────────────────────────────

const BATCH_SIZE = 40; // strings per Gemini call

interface BatchResult {
  translations: Map<string, string>;
  tokensUsed: number;
}

async function translateBatch(
  entries: TranslationEntry[],
  targetLanguage: string,
): Promise<BatchResult> {
  const langName = targetLanguage === "hi" ? "Hindi (हिन्दी)" : "Telugu (తెలుగు)";
  const scriptName = targetLanguage === "hi" ? "Devanagari" : "Telugu";

  // Build numbered list for Gemini
  const numberedTexts = entries.map((e, i) => `[${i}] ${e.original}`).join("\n");

  const systemPrompt = `You are an expert Vedic astrology translator specializing in ${langName}.
Your task is to translate English text into natural, fluent ${langName} using ${scriptName} script.

CRITICAL RULES:
1. Output MUST be entirely in ${scriptName} script — NO Latin/English characters whatsoever
2. Vedic astrology terms must use their traditional ${langName} equivalents (e.g., Mahadasha→${targetLanguage === "hi" ? "महादशा" : "మహాదశ"}, Antardasha→${targetLanguage === "hi" ? "अंतर्दशा" : "అంతర్దశ"})
3. Planet names: Sun→${targetLanguage === "hi" ? "सूर्य" : "సూర్యుడు"}, Moon→${targetLanguage === "hi" ? "चंद्रमा" : "చంద్రుడు"}, Mars→${targetLanguage === "hi" ? "मंगल" : "కుజుడు"}, Mercury→${targetLanguage === "hi" ? "बुध" : "బుధుడు"}, Jupiter→${targetLanguage === "hi" ? "गुरु" : "గురుడు"}, Venus→${targetLanguage === "hi" ? "शुक्र" : "శుక్రుడు"}, Saturn→${targetLanguage === "hi" ? "शनि" : "శని"}, Rahu→${targetLanguage === "hi" ? "राहु" : "రాహు"}, Ketu→${targetLanguage === "hi" ? "केतु" : "కేతు"}
4. Zodiac signs: Aries→${targetLanguage === "hi" ? "मेष" : "మేషం"}, Taurus→${targetLanguage === "hi" ? "वृषभ" : "వృషభం"}, etc. — use standard ${langName} names
5. Keep the meaning accurate and natural — this is a professional astrology report
6. Do NOT add extra content, commentary, or explanations
7. Numbers can remain as Arabic numerals (1, 2, 3...)
8. Preserve any sentence-ending punctuation (use ${targetLanguage === "hi" ? "।" : "."} for periods)`;

  const userPrompt = `Translate each numbered text below into ${langName}. Return a JSON object mapping the number to the translated text.

Input texts:
${numberedTexts}

Return format: { "0": "translated text for [0]", "1": "translated text for [1]", ... }`;

  const toolSchema = {
    type: "object" as const,
    properties: {
      translations: {
        type: "object" as const,
        description: `Map of index to translated ${langName} text`,
        additionalProperties: { type: "string" as const },
      },
    },
    required: ["translations"],
    additionalProperties: false,
  };

  const result = await callAgent<{ translations: Record<string, string> }>(
    systemPrompt,
    userPrompt,
    "submit_translations",
    `Translate English text to ${langName}`,
    toolSchema,
  );

  const map = new Map<string, string>();
  const tokensUsed = result.tokensUsed || 0;

  if (result.success && result.data?.translations) {
    for (const [idxStr, translated] of Object.entries(result.data.translations)) {
      const idx = parseInt(idxStr, 10);
      if (!isNaN(idx) && idx < entries.length && translated) {
        // Validate: the translation should NOT be mostly Latin
        const letters = translated.replace(/[\s\d\p{P}\p{S}]/gu, "");
        const latinChars = (letters.match(/[A-Za-z]/g) || []).length;
        const latinRatio = letters.length > 0 ? latinChars / letters.length : 0;
        if (latinRatio < 0.25) {
          // Good translation — mostly in target script
          map.set(entries[idx].path, translated);
        } else {
          console.warn(`⚠️ [TRANSLATE] Rejected translation for "${entries[idx].path}" — too much Latin (${(latinRatio * 100).toFixed(0)}%)`);
        }
      }
    }
  } else {
    console.warn(`⚠️ [TRANSLATE] Batch translation failed: ${result.error}`);
  }

  return { translations: map, tokensUsed };
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface TranslationResult {
  stringsFound: number;
  stringsTranslated: number;
  batchesSent: number;
  errors: string[];
  tokensUsed: number;
}

/**
 * Run the translation agent on the full report.
 * Modifies the report IN-PLACE and returns stats.
 */
export async function runTranslationSweep(
  report: Record<string, any>,
  targetLanguage: string,
): Promise<TranslationResult> {
  const stats: TranslationResult = {
    stringsFound: 0,
    stringsTranslated: 0,
    batchesSent: 0,
    errors: [],
    tokensUsed: 0,
  };

  if (targetLanguage === "en") return stats;

  console.log(`🌐 [TRANSLATE] Starting translation sweep for language: ${targetLanguage}`);

  // Step 1: Collect all English strings
  const entries: TranslationEntry[] = [];
  collectEnglishStrings(report, "", entries);
  stats.stringsFound = entries.length;

  if (entries.length === 0) {
    console.log("✅ [TRANSLATE] No English strings found — report is clean");
    return stats;
  }

  console.log(`🔍 [TRANSLATE] Found ${entries.length} English strings to translate`);

  // Prioritize: sort so PRIORITY_KEYS come first (most visible in PDF)
  entries.sort((a, b) => {
    const lastKeyA = a.path.split(".").pop() || "";
    const lastKeyB = b.path.split(".").pop() || "";
    const aPriority = PRIORITY_KEYS.has(lastKeyA) ? 0 : 1;
    const bPriority = PRIORITY_KEYS.has(lastKeyB) ? 0 : 1;
    return aPriority - bPriority;
  });

  // Step 2: Batch and translate
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    stats.batchesSent++;

    try {
      console.log(`🔄 [TRANSLATE] Batch ${stats.batchesSent}: translating ${batch.length} strings...`);
      const { translations, tokensUsed } = await translateBatch(batch, targetLanguage);
      stats.tokensUsed += tokensUsed;

      for (const [path, translated] of translations) {
        setAtPath(report, path, translated);
        stats.stringsTranslated++;
      }

      console.log(`✅ [TRANSLATE] Batch ${stats.batchesSent}: ${translations.size}/${batch.length} translated`);
    } catch (err: any) {
      const msg = `Batch ${stats.batchesSent} failed: ${err?.message || err}`;
      console.error(`❌ [TRANSLATE] ${msg}`);
      stats.errors.push(msg);
    }
  }

  console.log(`🏁 [TRANSLATE] Sweep complete: ${stats.stringsTranslated}/${stats.stringsFound} strings translated in ${stats.batchesSent} batches`);
  return stats;
}
