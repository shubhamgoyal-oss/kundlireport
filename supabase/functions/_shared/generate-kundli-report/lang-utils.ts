// ── Language-pack bridge for all agents ──────────────────────────────────────
// Provides simple lookup functions so agents never need hardcoded dictionaries.
// All data comes from the canonical language packs (language-packs/{en,hi,te}/).

import { getLanguagePack } from "../language-packs/index.ts";
import type { LanguagePack, LanguageSection, PlanetSignification } from "../language-packs/types.ts";
import { getAgentLanguage, getAgentNativeContext } from "./agent-base.ts";

/** Return the active language pack based on current agent language context. */
export function activePack(): LanguagePack {
  return getLanguagePack(getAgentLanguage());
}

// ── Term lookups ─────────────────────────────────────────────────────────────

/** Look up a planet name in the active language. Falls back to the English key. */
export function planetName(english: string): string {
  return activePack().termMaps.planets[english] || english;
}

/** Look up a zodiac sign name in the active language. */
export function signName(english: string): string {
  return activePack().termMaps.signs[english] || english;
}

/** Look up a house name (by number) in the active language. */
export function houseName(houseNum: number | string): string {
  const pack = activePack();
  const key = String(houseNum);
  if (pack.code === "en") return pack.termMaps.houses[key] || `House ${houseNum}`;
  return pack.termMaps.houses[key] || `${houseNum}`;
}

/** Look up a weekday name in the active language. */
export function weekdayName(english: string): string {
  return activePack().termMaps.weekdays[english] || english;
}

/** Look up a nakshatra name in the active language. */
export function nakshatraName(english: string): string {
  return activePack().termMaps.nakshatras?.[english] || english;
}

/** Look up a month name in the active language. */
export function monthName(english: string): string {
  return activePack().termMaps.months?.[english] || english;
}

/** Look up any misc term in the active language. Falls back to the English key. */
export function term(english: string): string {
  return activePack().termMaps.misc?.[english] || english;
}

// ── Agent prompt helpers ─────────────────────────────────────────────────────

/**
 * Return the global language instruction from the active language pack.
 * This replaces the hardcoded getLanguageInstruction() in agent-base.ts.
 * Returns empty string for English.
 */
export function globalLanguageInstruction(): string {
  const pack = activePack();
  if (pack.code === "en") return "";
  const prefix = pack.agentPrompts?.global?.systemPrefix;
  if (!prefix) return "";
  return `\n\nCRITICAL LANGUAGE REQUIREMENT:\n${prefix}`;
}

/**
 * Return the section-specific prompt directive for a given agent section.
 * Falls back to the global directive if section-specific is not defined.
 */
export function sectionPrompt(section: LanguageSection): string {
  const pack = activePack();
  return pack.agentPrompts?.[section]?.systemPrefix
    || pack.agentPrompts?.global?.systemPrefix
    || "";
}

// ── Template helpers (Phase 2) ──────────────────────────────────────────────

/**
 * Look up a keyed template string in the active language pack and substitute
 * {placeholder} variables. Falls back to the key itself if not found.
 */
export function tmpl(key: string, vars?: Record<string, string>): string {
  const templates = activePack().templates;
  let text = (templates && key in templates) ? templates[key] : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, v);
    }
  }
  return text;
}

/**
 * Get planet signification (themes/opportunity/caution) in the active language.
 * Used by dasha-agent for antardasha interpretation templates.
 */
export function planetSig(planet: string): PlanetSignification {
  const pack = activePack();
  const sigs = pack.significations?.planets;
  const fallback: PlanetSignification = { themes: planet, opportunity: planet, caution: planet };
  return sigs?.[planet] || fallback;
}

// ── Native context instruction (gender + age) ────────────────────────────────
// Injected into every agent's system prompt so ALL predictions are gender-aware
// and age-appropriate. Zero changes needed in individual agent files.

const MAX_PREDICTION_AGE = 95;

/**
 * Build a native-context instruction block for the current native's gender,
 * approximate age, and prediction horizon.
 *
 * Returns empty string if native context was never set (graceful no-op).
 */
export function nativeContextInstruction(): string {
  const ctx = getAgentNativeContext();
  if (!ctx) return "";

  const ageYears = Math.max(
    0,
    Math.floor(
      (ctx.generatedAt.getTime() - ctx.birthDate.getTime()) /
        (365.25 * 24 * 60 * 60 * 1000)
    )
  );

  const genderLabel =
    ctx.gender === "F"
      ? "female"
      : ctx.gender === "O"
        ? "non-binary / gender-diverse"
        : "male";

  const remainingYears = Math.max(5, MAX_PREDICTION_AGE - ageYears);

  // Age-group label for the model
  let ageGroup: string;
  if (ageYears < 13) ageGroup = "child";
  else if (ageYears < 20) ageGroup = "teenager";
  else if (ageYears < 30) ageGroup = "young adult";
  else if (ageYears < 50) ageGroup = "adult";
  else if (ageYears < 65) ageGroup = "mature adult";
  else ageGroup = "senior";

  return `

NATIVE CONTEXT (apply to ALL predictions):
- Gender: ${genderLabel}
- Approximate Age: ${ageYears} years (${ageGroup})
- Maximum Prediction Horizon: ~${remainingYears} years from now (do NOT predict beyond age ${MAX_PREDICTION_AGE})

GENDER SENSITIVITY RULES:
1. Use gender-appropriate language throughout. For female natives, acknowledge women-specific life patterns (e.g. maternal health, career breaks, societal dynamics).
2. For male natives, acknowledge men-specific patterns (e.g. provider pressure, emotional expression).
3. For non-binary/gender-diverse natives, use fully inclusive language; avoid binary assumptions.
4. CRITICAL — Use gender-correct relationship terms: for a FEMALE native, refer to her partner as "husband" (not "spouse/partner"); for a MALE native, refer to his partner as "wife" (not "spouse/partner"). Only use "partner/spouse" for non-binary natives or when the context is gender-ambiguous.
5. Marriage, relationship, and family predictions must reflect the native's actual gender, not assume a default male perspective.

AGE SENSITIVITY RULES:
1. All future timelines MUST stay within the ~${remainingYears}-year horizon. Never predict events beyond age ${MAX_PREDICTION_AGE}.
2. If the native is a child/teenager (under 20): focus on education, personal growth, family dynamics. Avoid career-switch timing, marriage timing, or financial speculation.
3. If the native is a young adult (20-29): career entry, higher education, early relationships, and skill-building are appropriate focal points.
4. If the native is a mature adult or senior (50+): emphasize health, legacy, mentorship, spiritual growth, and relationship deepening. Avoid "start a new career from scratch" or unrealistic long-range plans.
5. Dasha/transit predictions that fall beyond the horizon should be truncated or noted as "beyond lifecycle scope."
6. Remedies should be physically appropriate for the age group (e.g. no intense fasting for seniors or children, no heavy physical rituals for elderly).

CRITICAL WRITING STYLE RULE — DO NOT REPEAT AGE/GENDER:
- The age and gender above are BACKGROUND CONTEXT for you to shape predictions appropriately. They are NOT to be stated or repeated in the output.
- NEVER write phrases like "As a 55-year-old man", "At your age of 55", "Being a male native of 55 years", "For someone your age", or any variation that explicitly calls out the native's age or gender.
- Simply write predictions that are implicitly appropriate for the native's life stage. The reader already knows their own age and gender.
- This is a professional astrology report, not a conversation. Write in a confident, direct third-person analytical tone without referencing demographic details.`;
}
