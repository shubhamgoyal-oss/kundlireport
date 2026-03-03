import type { LanguageQcRules } from "../types.ts";

export const MR_QC_RULES: LanguageQcRules = {
  minScriptChars: 20,
  minScriptRatio: 0.7,
  maxLatinRatio: 0.15,
  bannedTokens: [
    "libra", "aries", "taurus", "gemini", "cancer", "leo", "virgo", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
    "tuesday", "monday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "saturn", "jupiter", "venus", "mercury", "mars", "moon", "sun",
    "house", "career", "marriage", "health", "planet", "sign", "nakshatra", "ascendant", "analysis", "guidance", "remedy", "phase", "active",
  ],
  allowedLatinTokens: ["api", "pdf", "utc", "am", "pm", "ai"],
};
