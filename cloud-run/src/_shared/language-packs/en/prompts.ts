import type { LanguagePack } from "../types";

export const EN_AGENT_PROMPTS: LanguagePack["agentPrompts"] = {
  global: {
    systemPrefix: "Output language: English. Keep technical astrology terms precise and avoid transliterated Hindi/Telugu words.",
    userPrefix: "Respond in clear English paragraphs with concrete chart-linked reasoning.",
  },
};
