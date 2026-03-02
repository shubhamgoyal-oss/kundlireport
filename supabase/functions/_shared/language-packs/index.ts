import type { LanguagePack, SupportedLanguage } from "./types.ts";

import { EN_AGENT_PROMPTS } from "./en/prompts.ts";
import { EN_STATIC_LABELS } from "./en/labels.ts";
import { EN_TERM_MAPS } from "./en/terms.ts";
import { EN_TYPOGRAPHY } from "./en/typography.ts";
import { EN_QC_RULES } from "./en/qc.ts";
import { EN_TEMPLATES } from "./en/templates.ts";
import { EN_SIGNIFICATIONS } from "./en/significations.ts";

import { HI_AGENT_PROMPTS } from "./hi/prompts.ts";
import { HI_STATIC_LABELS } from "./hi/labels.ts";
import { HI_TERM_MAPS } from "./hi/terms.ts";
import { HI_TYPOGRAPHY } from "./hi/typography.ts";
import { HI_QC_RULES } from "./hi/qc.ts";
import { HI_TEMPLATES } from "./hi/templates.ts";
import { HI_SIGNIFICATIONS } from "./hi/significations.ts";

import { TE_AGENT_PROMPTS } from "./te/prompts.ts";
import { TE_STATIC_LABELS } from "./te/labels.ts";
import { TE_TERM_MAPS } from "./te/terms.ts";
import { TE_TYPOGRAPHY } from "./te/typography.ts";
import { TE_QC_RULES } from "./te/qc.ts";
import { TE_TEMPLATES } from "./te/templates.ts";
import { TE_SIGNIFICATIONS } from "./te/significations.ts";

const REGISTRY: Record<SupportedLanguage, LanguagePack> = {
  en: {
    code: "en",
    version: "en_v2",
    generationMode: "native",
    agentPrompts: EN_AGENT_PROMPTS,
    staticLabels: EN_STATIC_LABELS,
    termMaps: EN_TERM_MAPS,
    templates: EN_TEMPLATES,
    significations: EN_SIGNIFICATIONS,
    typography: EN_TYPOGRAPHY,
    qcRules: EN_QC_RULES,
  },
  hi: {
    code: "hi",
    version: "hi_v2",
    generationMode: "native",
    agentPrompts: HI_AGENT_PROMPTS,
    staticLabels: HI_STATIC_LABELS,
    termMaps: HI_TERM_MAPS,
    templates: HI_TEMPLATES,
    significations: HI_SIGNIFICATIONS,
    typography: HI_TYPOGRAPHY,
    qcRules: HI_QC_RULES,
  },
  te: {
    code: "te",
    version: "te_v2",
    generationMode: "native",
    agentPrompts: TE_AGENT_PROMPTS,
    staticLabels: TE_STATIC_LABELS,
    termMaps: TE_TERM_MAPS,
    templates: TE_TEMPLATES,
    significations: TE_SIGNIFICATIONS,
    typography: TE_TYPOGRAPHY,
    qcRules: TE_QC_RULES,
  },
};

export function normalizeLanguage(input: unknown): SupportedLanguage {
  const raw = String(input || "").trim().toLowerCase();
  if (raw.startsWith("hi")) return "hi";
  if (raw.startsWith("te")) return "te";
  return "en";
}

export function getLanguagePack(language: unknown): LanguagePack {
  return REGISTRY[normalizeLanguage(language)];
}

export function listLanguagePacks(): LanguagePack[] {
  return Object.values(REGISTRY);
}
