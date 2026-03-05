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

import { KN_AGENT_PROMPTS } from "./kn/prompts.ts";
import { KN_STATIC_LABELS } from "./kn/labels.ts";
import { KN_TERM_MAPS } from "./kn/terms.ts";
import { KN_TYPOGRAPHY } from "./kn/typography.ts";
import { KN_QC_RULES } from "./kn/qc.ts";
import { KN_TEMPLATES } from "./kn/templates.ts";
import { KN_SIGNIFICATIONS } from "./kn/significations.ts";

import { MR_AGENT_PROMPTS } from "./mr/prompts.ts";
import { MR_STATIC_LABELS } from "./mr/labels.ts";
import { MR_TERM_MAPS } from "./mr/terms.ts";
import { MR_TYPOGRAPHY } from "./mr/typography.ts";
import { MR_QC_RULES } from "./mr/qc.ts";
import { MR_TEMPLATES } from "./mr/templates.ts";
import { MR_SIGNIFICATIONS } from "./mr/significations.ts";

import { TA_AGENT_PROMPTS } from "./ta/prompts.ts";
import { TA_STATIC_LABELS } from "./ta/labels.ts";
import { TA_TERM_MAPS } from "./ta/terms.ts";
import { TA_TYPOGRAPHY } from "./ta/typography.ts";
import { TA_QC_RULES } from "./ta/qc.ts";
import { TA_TEMPLATES } from "./ta/templates.ts";
import { TA_SIGNIFICATIONS } from "./ta/significations.ts";

import { GU_AGENT_PROMPTS } from "./gu/prompts.ts";
import { GU_STATIC_LABELS } from "./gu/labels.ts";
import { GU_TERM_MAPS } from "./gu/terms.ts";
import { GU_TYPOGRAPHY } from "./gu/typography.ts";
import { GU_QC_RULES } from "./gu/qc.ts";
import { GU_TEMPLATES } from "./gu/templates.ts";
import { GU_SIGNIFICATIONS } from "./gu/significations.ts";

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
  kn: {
    code: "kn",
    version: "kn_v2",
    generationMode: "native",
    agentPrompts: KN_AGENT_PROMPTS,
    staticLabels: KN_STATIC_LABELS,
    termMaps: KN_TERM_MAPS,
    templates: KN_TEMPLATES,
    significations: KN_SIGNIFICATIONS,
    typography: KN_TYPOGRAPHY,
    qcRules: KN_QC_RULES,
  },
  mr: {
    code: "mr",
    version: "mr_v2",
    generationMode: "native",
    agentPrompts: MR_AGENT_PROMPTS,
    staticLabels: MR_STATIC_LABELS,
    termMaps: MR_TERM_MAPS,
    templates: MR_TEMPLATES,
    significations: MR_SIGNIFICATIONS,
    typography: MR_TYPOGRAPHY,
    qcRules: MR_QC_RULES,
  },
  ta: {
    code: "ta",
    version: "ta_v2",
    generationMode: "native",
    agentPrompts: TA_AGENT_PROMPTS,
    staticLabels: TA_STATIC_LABELS,
    termMaps: TA_TERM_MAPS,
    templates: TA_TEMPLATES,
    significations: TA_SIGNIFICATIONS,
    typography: TA_TYPOGRAPHY,
    qcRules: TA_QC_RULES,
  },
  gu: {
    code: "gu",
    version: "gu_v2",
    generationMode: "native",
    agentPrompts: GU_AGENT_PROMPTS,
    staticLabels: GU_STATIC_LABELS,
    termMaps: GU_TERM_MAPS,
    templates: GU_TEMPLATES,
    significations: GU_SIGNIFICATIONS,
    typography: GU_TYPOGRAPHY,
    qcRules: GU_QC_RULES,
  },
};

export function normalizeLanguage(input: unknown): SupportedLanguage {
  const raw = String(input || "").trim().toLowerCase();
  if (raw.startsWith("hi")) return "hi";
  if (raw.startsWith("te")) return "te";
  if (raw.startsWith("kn") || raw.startsWith("kan")) return "kn";
  if (raw.startsWith("mr") || raw.startsWith("mar")) return "mr";
  if (raw.startsWith("ta") || raw.startsWith("tam")) return "ta";
  if (raw.startsWith("gu") || raw.startsWith("guj")) return "gu";
  return "en";
}

export function getLanguagePack(language: unknown): LanguagePack {
  return REGISTRY[normalizeLanguage(language)];
}

export function listLanguagePacks(): LanguagePack[] {
  return Object.values(REGISTRY);
}
