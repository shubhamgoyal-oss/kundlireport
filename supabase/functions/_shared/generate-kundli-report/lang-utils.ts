// ── Language-pack bridge for all agents ──────────────────────────────────────
// Provides simple lookup functions so agents never need hardcoded dictionaries.
// All data comes from the canonical language packs (language-packs/{en,hi,te}/).

import { getLanguagePack } from "../language-packs/index.ts";
import type { LanguagePack, LanguageSection } from "../language-packs/types.ts";
import { getAgentLanguage } from "./agent-base.ts";

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
