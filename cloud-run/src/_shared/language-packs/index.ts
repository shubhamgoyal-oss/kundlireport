import type { LanguagePack, SupportedLanguage } from "./types";

import { EN_AGENT_PROMPTS } from "./en/prompts";
import { EN_STATIC_LABELS } from "./en/labels";
import { EN_TERM_MAPS } from "./en/terms";
import { EN_TYPOGRAPHY } from "./en/typography";
import { EN_QC_RULES } from "./en/qc";
import { EN_TEMPLATES } from "./en/templates";
import { EN_SIGNIFICATIONS } from "./en/significations";

import { HI_AGENT_PROMPTS } from "./hi/prompts";
import { HI_STATIC_LABELS } from "./hi/labels";
import { HI_TERM_MAPS } from "./hi/terms";
import { HI_TYPOGRAPHY } from "./hi/typography";
import { HI_QC_RULES } from "./hi/qc";
import { HI_TEMPLATES } from "./hi/templates";
import { HI_SIGNIFICATIONS } from "./hi/significations";

import { TE_AGENT_PROMPTS } from "./te/prompts";
import { TE_STATIC_LABELS } from "./te/labels";
import { TE_TERM_MAPS } from "./te/terms";
import { TE_TYPOGRAPHY } from "./te/typography";
import { TE_QC_RULES } from "./te/qc";
import { TE_TEMPLATES } from "./te/templates";
import { TE_SIGNIFICATIONS } from "./te/significations";

import { KN_AGENT_PROMPTS } from "./kn/prompts";
import { KN_STATIC_LABELS } from "./kn/labels";
import { KN_TERM_MAPS } from "./kn/terms";
import { KN_TYPOGRAPHY } from "./kn/typography";
import { KN_QC_RULES } from "./kn/qc";
import { KN_TEMPLATES } from "./kn/templates";
import { KN_SIGNIFICATIONS } from "./kn/significations";

import { MR_AGENT_PROMPTS } from "./mr/prompts";
import { MR_STATIC_LABELS } from "./mr/labels";
import { MR_TERM_MAPS } from "./mr/terms";
import { MR_TYPOGRAPHY } from "./mr/typography";
import { MR_QC_RULES } from "./mr/qc";
import { MR_TEMPLATES } from "./mr/templates";
import { MR_SIGNIFICATIONS } from "./mr/significations";

import { TA_AGENT_PROMPTS } from "./ta/prompts";
import { TA_STATIC_LABELS } from "./ta/labels";
import { TA_TERM_MAPS } from "./ta/terms";
import { TA_TYPOGRAPHY } from "./ta/typography";
import { TA_QC_RULES } from "./ta/qc";
import { TA_TEMPLATES } from "./ta/templates";
import { TA_SIGNIFICATIONS } from "./ta/significations";

import { GU_AGENT_PROMPTS } from "./gu/prompts";
import { GU_STATIC_LABELS } from "./gu/labels";
import { GU_TERM_MAPS } from "./gu/terms";
import { GU_TYPOGRAPHY } from "./gu/typography";
import { GU_QC_RULES } from "./gu/qc";
import { GU_TEMPLATES } from "./gu/templates";
import { GU_SIGNIFICATIONS } from "./gu/significations";

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
