/**
 * Translation Agent — Final sweep to translate any remaining English text
 * in Hindi/Telugu reports before Language QC validation.
 *
 * Runs AFTER all content agents + truth guard + safety enforcement, BEFORE QC.
 * Walks the entire report JSON, detects English strings, batches them,
 * and sends to Gemini for translation. This makes the system bulletproof
 * against English leakage from AI fallbacks, dynamic labels, or edge cases.
 *
 * Design:
 *   1. Collect all strings with significant Latin content (>15% Latin chars)
 *   2. Group by top-level report section for contextual batching
 *   3. Translate in batches of 25 via Gemini tool-call (with 2 retries per batch)
 *   4. Validate each translation: reject if output is still >25% Latin or suspiciously short
 *   5. Apply translations back to the report in-place
 *   6. Final re-scan to count any remaining English strings
 */

import { callAgent, type AgentResponse } from "./agent-base.ts";

// ── Configuration ────────────────────────────────────────────────────────────

const BATCH_SIZE = 25;          // Strings per Gemini call (lower = more reliable)
const MAX_RETRIES = 2;          // Retry failed batches up to 2 more times
const RETRY_DELAY_MS = 3_000;   // 3 seconds between retries
const LATIN_RATIO_THRESHOLD = 0.15; // 15% Latin → needs translation (thorough)
const MIN_STRING_LENGTH = 8;    // Minimum string length to consider
const MIN_LETTER_COUNT = 4;     // Minimum non-space/digit/punct letters

// ── Detection heuristics ────────────────────────────────────────────────────

/**
 * Keys whose values should NEVER be translated.
 * Checked against the immediate parent key of each string value.
 */
const SKIP_KEYS = new Set([
  // ── Metadata / internal ──
  "language", "generationMode", "languagePackVersion", "failureCode",
  "generation_language_mode", "language_qc", "report_data",
  "visitorId", "sessionId", "jobId", "id", "status",
  "generatedAt", "createdAt", "updatedAt", "completedAt",
  "errors", "qa", "languageQc", "languageQcPassed",
  "seerRawResponse", "seerRequest", "computationMeta",
  "translationSweep", "translationStats",
  "predictionSafety", "interpolation", "languagePipeline",

  // ── Birth details / coordinates ──
  "birthDetails", "latitude", "longitude", "timezone",
  "dateOfBirth", "timeOfBirth", "placeOfBirth",
  "city", "state", "country", "gender",

  // ── Planetary data (structural / identifiers) ──
  "planet", "sign", "house", "degree", "signIdx", "deg",
  "nakshatra", "pada", "lord", "dignity", "speed",
  "isRetro", "isRetrograde", "retrograde",

  // ── Dasha periods (dates/labels used as keys) ──
  "startDate", "endDate", "approximatePeriod", "duration",
  "dashaLabel", "period",

  // ── Names / pre-localized labels ──
  "name",       // planet/yoga names — handled by term maps
  "nameHindi", "nameTelugu", "nameEnglish",
  "purposeHindi", "purposeTelugu",

  // ── Charts / media ──
  "chartUrl", "imageUrl", "svgData", "svg", "charts",
  "type",       // chart type identifiers like "D1", "D9"

  // ── Scores / numeric metadata ──
  "score", "overallScore", "tokensUsed", "version",

  // ── Safety meta keys ──
  "medicalDisclaimer", "statusAssumption", "safeguardPolicy",
  "ageGroup", "whenApplicable",
]);

/**
 * Top-level report keys whose entire subtrees should be skipped.
 */
const SKIP_TOP_LEVEL = new Set([
  "seerRawResponse", "seerRequest", "computationMeta",
  "charts", "qa", "languageQc", "errors",
  "birthDetails",         // technical birth info, not prose
  "planetaryPositions", "ascendant", "charaKarakas",
  "aspects", "conjunctions",
  "translationSweep", "translationStats",
]);

/** Keys whose values are narrative and benefit most from translation */
const PRIORITY_KEYS = new Set([
  "overview", "interpretation", "advice", "description",
  "careerImpact", "relationshipImpact", "healthImpact",
  "financialImpact", "spiritualGrowth", "moonSaturnRelationship",
  "characteristics", "lifeFocus", "briefPrediction",
  "focus", "formation", "benefits", "inYourChart",
  "definition", "meaning", "explanation", "significance",
  "narrative", "prediction", "analysis", "guidance",
  "recommendation", "remedy", "challenge", "opportunity",
  "impact", "summary", "insight", "currentPhase",
  "timing", "rationale", "plan", "cautionNote",
  "practicalAdvice", "spiritualAdvice", "remedyAdvice",
  "title", "sectionTitle", "heading", "subHeading",
]);

/** Check if a string value needs translation */
function needsTranslation(text: string): boolean {
  if (!text || text.length < MIN_STRING_LENGTH) return false;

  // Skip technical/date/time/URL values
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return false;
  if (/^\d{1,2}:\d{2}/.test(text)) return false;
  if (/^UTC[+-]/i.test(text)) return false;
  if (/^https?:\/\//.test(text)) return false;
  if (/^data:(image|application)\//.test(text)) return false;
  if (/^<svg[\s>]/.test(text)) return false;
  if (/^[A-Z]{2,5}([_-][A-Z0-9]+)?$/.test(text)) return false;
  if (/^[~≈]?\d+(\.\d+)?\s*(months?|years?|days?|hrs?)?$/i.test(text)) return false;
  if (/^(true|false|null|undefined|none|yes|no|active|inactive)$/i.test(text)) return false;
  if (/^[MFO]$/.test(text)) return false;
  if (/^(en|hi|te|native|legacy)$/i.test(text)) return false;

  // Count actual letters (strip spaces, digits, punctuation, symbols)
  const letters = text.replace(/[\s\d\p{P}\p{S}]/gu, "");
  if (letters.length < MIN_LETTER_COUNT) return false;

  const latinChars = (letters.match(/[A-Za-z]/g) || []).length;
  const latinRatio = latinChars / letters.length;

  // If >15% of letters are Latin, it needs translation
  return latinRatio > LATIN_RATIO_THRESHOLD;
}

// ── Report walker ───────────────────────────────────────────────────────────

interface TranslationEntry {
  path: string;     // JSON path like "career.overview" or "planets[0].analysis"
  original: string; // Original English text
  section: string;  // Top-level section key for grouping
}

/** Recursively walk the report and collect strings needing translation */
function collectEnglishStrings(
  obj: unknown,
  path: string,
  results: TranslationEntry[],
  parentKey?: string,
  topLevelSection?: string,
): void {
  // Skip if parent key is in the skip list
  if (parentKey && SKIP_KEYS.has(parentKey)) return;

  if (typeof obj === "string") {
    if (needsTranslation(obj)) {
      const section = topLevelSection || path.split(".")[0] || "_root";
      results.push({ path, original: obj, section });
    }
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      collectEnglishStrings(item, `${path}[${idx}]`, results, parentKey, topLevelSection);
    });
    return;
  }

  if (obj && typeof obj === "object") {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const fullPath = path ? `${path}.${key}` : key;
      const section = topLevelSection || key;

      // Skip entire top-level subtrees that are technical/debug data
      if (!path && SKIP_TOP_LEVEL.has(key)) continue;

      collectEnglishStrings(value, fullPath, results, key, section);
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

interface BatchResult {
  translations: Map<string, string>;
  tokensUsed: number;
  error?: string;
}

async function translateBatch(
  entries: TranslationEntry[],
  targetLanguage: string,
  sectionContext: string,
): Promise<BatchResult> {
  const langName = targetLanguage === "hi" ? "Hindi (हिन्दी)" : "Telugu (తెలుగు)";
  const scriptName = targetLanguage === "hi" ? "Devanagari" : "Telugu";

  // Build numbered list for Gemini — use double newline for clarity
  const numberedTexts = entries.map((e, i) => `[${i}] ${e.original}`).join("\n\n");

  const systemPrompt = `You are an expert Vedic astrology translator specializing in ${langName}.
Your task is to translate English text into natural, fluent ${langName} using ${scriptName} script.
These strings are from the "${sectionContext}" section of a Vedic astrology (Jyotish) report.

CRITICAL RULES:
1. Output MUST be entirely in ${scriptName} script — ZERO Latin/English characters whatsoever.
2. Vedic astrology terms must use their traditional ${langName} equivalents:
   - Planets: Sun→${targetLanguage === "hi" ? "सूर्य" : "సూర్యుడు"}, Moon→${targetLanguage === "hi" ? "चंद्रमा" : "చంద్రుడు"}, Mars→${targetLanguage === "hi" ? "मंगल" : "కుజుడు"}, Mercury→${targetLanguage === "hi" ? "बुध" : "బుధుడు"}, Jupiter→${targetLanguage === "hi" ? "गुरु" : "గురుడు"}, Venus→${targetLanguage === "hi" ? "शुक्र" : "శుక్రుడు"}, Saturn→${targetLanguage === "hi" ? "शनि" : "శని"}, Rahu→${targetLanguage === "hi" ? "राहु" : "రాహు"}, Ketu→${targetLanguage === "hi" ? "केतु" : "కేతు"}
   - Signs: Aries→${targetLanguage === "hi" ? "मेष" : "మేషం"}, Taurus→${targetLanguage === "hi" ? "वृषभ" : "వృషభం"}, Gemini→${targetLanguage === "hi" ? "मिथुन" : "మిథునం"}, Cancer→${targetLanguage === "hi" ? "कर्क" : "కర్కాటకం"}, Leo→${targetLanguage === "hi" ? "सिंह" : "సింహం"}, Virgo→${targetLanguage === "hi" ? "कन्या" : "కన్య"}, Libra→${targetLanguage === "hi" ? "तुला" : "తుల"}, Scorpio→${targetLanguage === "hi" ? "वृश्चिक" : "వృశ్చికం"}, Sagittarius→${targetLanguage === "hi" ? "धनु" : "ధనుస్సు"}, Capricorn→${targetLanguage === "hi" ? "मकर" : "మకరం"}, Aquarius→${targetLanguage === "hi" ? "कुम्भ" : "కుంభం"}, Pisces→${targetLanguage === "hi" ? "मीन" : "మీనం"}
   - Terms: Mahadasha→${targetLanguage === "hi" ? "महादशा" : "మహాదశ"}, Antardasha→${targetLanguage === "hi" ? "अंतर्दशा" : "అంతర్దశ"}, Yoga→${targetLanguage === "hi" ? "योग" : "యోగం"}, Dosha→${targetLanguage === "hi" ? "दोष" : "దోషం"}, Nakshatra→${targetLanguage === "hi" ? "नक्षत्र" : "నక్షత్రం"}, House→${targetLanguage === "hi" ? "भाव" : "భావం"}, Ascendant→${targetLanguage === "hi" ? "लग्न" : "లగ్నం"}
   - Life areas: Career→${targetLanguage === "hi" ? "करियर" : "వృత్తి"}, Marriage→${targetLanguage === "hi" ? "विवाह" : "వివాహం"}, Health→${targetLanguage === "hi" ? "स्वास्थ्य" : "ఆరోగ్యం"}, Prediction→${targetLanguage === "hi" ? "भविष्यवाणी" : "భవిష్యవాణి"}, Opportunity→${targetLanguage === "hi" ? "अवसर" : "అవకాశం"}, Challenge→${targetLanguage === "hi" ? "चुनौती" : "సవాలు"}, Impact→${targetLanguage === "hi" ? "प्रभाव" : "ప్రభావం"}, Remedy→${targetLanguage === "hi" ? "उपाय" : "పరిహారం"}, Mantra→${targetLanguage === "hi" ? "मंत्र" : "మంత్రం"}, Gemstone→${targetLanguage === "hi" ? "रत्न" : "రత్నం"}
3. If text mixes ${scriptName} and English, translate ONLY the English portions — preserve existing ${scriptName} text.
4. Keep numbers as Arabic numerals (1, 2, 3...) and dates in their original format.
5. Use natural ${langName} sentence structure — NOT word-by-word translation.
6. Maintain the same meaning, tone, detail level, and paragraph structure.
7. Preserve bullet points (•), dashes (—), and formatting markers.
8. Use ${targetLanguage === "hi" ? "।" : "."} for sentence endings instead of periods.
9. Do NOT add extra content, commentary, or explanations.
10. Even parenthetical English like "(Saturn)" must become "(${targetLanguage === "hi" ? "शनि" : "శని"})".`;

  const userPrompt = `Translate each numbered text below into ${langName}. Return a JSON object mapping the number to the translated text.

IMPORTANT: Every single English word must be translated to ${scriptName} script. Check your output has ZERO English words.

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

  if (!result.success || !result.data) {
    return {
      translations: map,
      tokensUsed,
      error: result.error || "Translation call failed",
    };
  }

  const rawTranslations = result.data?.translations || result.data;

  for (const [idxStr, translated] of Object.entries(rawTranslations)) {
    const idx = parseInt(idxStr, 10);
    if (isNaN(idx) || idx >= entries.length || !translated) continue;

    const translatedText = String(translated).trim();
    if (!translatedText) continue;

    // Validate: the translation should NOT be mostly Latin
    const letters = translatedText.replace(/[\s\d\p{P}\p{S}]/gu, "");
    const latinChars = (letters.match(/[A-Za-z]/g) || []).length;
    const latinRatio = letters.length > 0 ? latinChars / letters.length : 0;
    if (latinRatio > 0.25) {
      console.warn(`⚠️ [TRANSLATE] Rejected translation for "${entries[idx].path}" — still ${(latinRatio * 100).toFixed(0)}% Latin`);
      continue;
    }

    // Validate: translated text should not be suspiciously short (dropped content)
    if (translatedText.length < entries[idx].original.length * 0.15 && entries[idx].original.length > 30) {
      console.warn(`⚠️ [TRANSLATE] Rejected suspiciously short translation for "${entries[idx].path}": ${translatedText.length} vs ${entries[idx].original.length} chars`);
      continue;
    }

    // Good translation
    map.set(entries[idx].path, translatedText);
  }

  return { translations: map, tokensUsed };
}

/**
 * Translate a batch with retry logic.
 * Retries up to MAX_RETRIES times with RETRY_DELAY_MS between attempts.
 */
async function translateBatchWithRetry(
  entries: TranslationEntry[],
  targetLanguage: string,
  sectionContext: string,
  batchLabel: string,
): Promise<BatchResult> {
  let lastResult: BatchResult | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await translateBatch(entries, targetLanguage, sectionContext);

      // If we got some translations (even partial), accept it
      if (result.translations.size > 0 || !result.error) {
        if (attempt > 0) {
          console.log(`✅ [TRANSLATE] Batch "${batchLabel}" succeeded on retry ${attempt}`);
        }
        return result;
      }

      lastResult = result;
      console.warn(`⚠️ [TRANSLATE] Batch "${batchLabel}" attempt ${attempt + 1}/${MAX_RETRIES + 1} failed: ${result.error}`);
    } catch (err: any) {
      lastResult = {
        translations: new Map(),
        tokensUsed: 0,
        error: `Crashed: ${err?.message || err}`,
      };
      console.error(`💥 [TRANSLATE] Batch "${batchLabel}" attempt ${attempt + 1}/${MAX_RETRIES + 1} crashed:`, err?.message || err);
    }

    // Wait before retry
    if (attempt < MAX_RETRIES) {
      console.log(`🔄 [TRANSLATE] Retrying batch "${batchLabel}" in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }

  console.error(`❌ [TRANSLATE] Batch "${batchLabel}" EXHAUSTED all ${MAX_RETRIES + 1} attempts`);
  return lastResult || { translations: new Map(), tokensUsed: 0, error: "All retries exhausted" };
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface TranslationResult {
  stringsFound: number;
  stringsTranslated: number;
  batchesSent: number;
  errors: string[];
  tokensUsed: number;
  remainingEnglishCount: number;
  sectionBreakdown: Record<string, { found: number; translated: number }>;
}

/**
 * Run the translation agent on the full report.
 * Modifies the report IN-PLACE and returns stats.
 *
 * The agent:
 *  1. Walks the entire report JSON tree
 *  2. Detects strings with >15% Latin characters
 *  3. Groups by report section for contextual translation
 *  4. Sends batches of 25 to Gemini (with 2 retries per batch)
 *  5. Validates each translation (rejects if still Latin or too short)
 *  6. Applies valid translations back to the report
 *  7. Does a final re-scan to count remaining English strings
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
    remainingEnglishCount: 0,
    sectionBreakdown: {},
  };

  if (targetLanguage === "en") return stats;

  const langLabel = targetLanguage === "hi" ? "Hindi" : "Telugu";
  console.log(`🌐 [TRANSLATE] Starting ${langLabel} translation sweep (threshold: ${(LATIN_RATIO_THRESHOLD * 100).toFixed(0)}%, batch: ${BATCH_SIZE}, retries: ${MAX_RETRIES})...`);

  // ── Step 1: Collect all English strings ────────────────────────────────────
  const entries: TranslationEntry[] = [];
  collectEnglishStrings(report, "", entries);
  stats.stringsFound = entries.length;

  if (entries.length === 0) {
    console.log("✅ [TRANSLATE] No English strings found — report is clean!");
    return stats;
  }

  // Group by section for logging and context
  const sectionGroups = new Map<string, TranslationEntry[]>();
  for (const entry of entries) {
    if (!sectionGroups.has(entry.section)) sectionGroups.set(entry.section, []);
    sectionGroups.get(entry.section)!.push(entry);
  }

  // Log discovery summary
  console.log(`🔍 [TRANSLATE] Found ${entries.length} English strings across ${sectionGroups.size} sections:`);
  for (const [sec, secEntries] of sectionGroups) {
    console.log(`  📄 ${sec}: ${secEntries.length} strings`);
    stats.sectionBreakdown[sec] = { found: secEntries.length, translated: 0 };
  }

  // Prioritize: sort so PRIORITY_KEYS come first (most visible in PDF)
  entries.sort((a, b) => {
    const lastKeyA = a.path.split(".").pop()?.replace(/\[\d+\]$/, "") || "";
    const lastKeyB = b.path.split(".").pop()?.replace(/\[\d+\]$/, "") || "";
    const aPriority = PRIORITY_KEYS.has(lastKeyA) ? 0 : 1;
    const bPriority = PRIORITY_KEYS.has(lastKeyB) ? 0 : 1;
    return aPriority - bPriority;
  });

  // ── Step 2: Batch and translate with retry ────────────────────────────────
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    stats.batchesSent++;

    // Determine primary section for batch context
    const sectionCounts = new Map<string, number>();
    for (const e of batch) {
      sectionCounts.set(e.section, (sectionCounts.get(e.section) || 0) + 1);
    }
    const primarySection = [...sectionCounts.entries()]
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "general";

    const batchLabel = `batch-${stats.batchesSent} (${primarySection}, ${batch.length} strings)`;

    try {
      console.log(`🔄 [TRANSLATE] ${batchLabel}: translating...`);
      const { translations, tokensUsed, error } = await translateBatchWithRetry(
        batch,
        targetLanguage,
        primarySection,
        batchLabel,
      );
      stats.tokensUsed += tokensUsed;

      if (error && translations.size === 0) {
        stats.errors.push(`${batchLabel}: ${error}`);
      }

      // Apply translations
      for (const [path, translated] of translations) {
        setAtPath(report, path, translated);
        stats.stringsTranslated++;

        // Update section breakdown
        const entry = batch.find((e) => e.path === path);
        if (entry && stats.sectionBreakdown[entry.section]) {
          stats.sectionBreakdown[entry.section].translated++;
        }
      }

      console.log(`✅ [TRANSLATE] ${batchLabel}: ${translations.size}/${batch.length} translated (${tokensUsed} tokens)`);
    } catch (err: any) {
      const msg = `${batchLabel} failed: ${err?.message || err}`;
      console.error(`❌ [TRANSLATE] ${msg}`);
      stats.errors.push(msg);
    }
  }

  // ── Step 3: Final re-scan for remaining English ───────────────────────────
  const remaining: TranslationEntry[] = [];
  collectEnglishStrings(report, "", remaining);
  stats.remainingEnglishCount = remaining.length;

  if (remaining.length > 0) {
    console.warn(`⚠️ [TRANSLATE] ${remaining.length} strings still have English after sweep:`);
    // Log first 10 for debugging
    for (const entry of remaining.slice(0, 10)) {
      const preview = entry.original.length > 80
        ? entry.original.substring(0, 80) + "..."
        : entry.original;
      console.warn(`  → ${entry.path}: "${preview}"`);
    }
  } else {
    console.log("✅ [TRANSLATE] Post-sweep verification: ZERO English strings remaining!");
  }

  console.log(`🏁 [TRANSLATE] Sweep complete: ${stats.stringsTranslated}/${stats.stringsFound} strings translated in ${stats.batchesSent} batches (${stats.tokensUsed} tokens, ${stats.remainingEnglishCount} remaining)`);
  return stats;
}
