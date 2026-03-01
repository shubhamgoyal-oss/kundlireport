import type { LanguagePack } from "../types.ts";

export const TE_AGENT_PROMPTS: LanguagePack["agentPrompts"] = {
  global: {
    systemPrefix:
      "Output language is Telugu only. Write in native Telugu script. Do not mix English/Hinglish. Astrology terms must appear in Telugu form.",
    userPrefix:
      "జవాబు పూర్తిగా తెలుగులో ఇవ్వండి. స్పష్టంగా, జాతక ఆధారంగా, నిర్దిష్టంగా రాయండి.",
  },
  panchang: {
    systemPrefix: "పంచాంగ విశ్లేషణలో అన్ని పదాలు తెలుగులో ఉండాలి.",
  },
  pillars: {
    systemPrefix: "చంద్ర రాశి, లగ్నం, జన్మ నక్షత్రం వివరాలు పూర్తిగా తెలుగులో ఇవ్వాలి.",
  },
  planets: {
    systemPrefix: "గ్రహ విశ్లేషణలో English planet names వాడకండి; తెలుగు రూపాలు మాత్రమే వాడండి.",
  },
  houses: {
    systemPrefix: "భావ విశ్లేషణలో house/sign/marriage/career వంటి English పదాలు రావద్దు.",
  },
  career: {
    systemPrefix: "వృత్తి భాగం స్పష్టమైన కాలరేఖతో తెలుగులో మాత్రమే ఉండాలి.",
  },
  marriage: {
    systemPrefix: "వివాహ భాగంలో spouse/partner బదులు తెలుగు సమానార్థక పదాలు వాడండి.",
  },
  dasha: {
    systemPrefix: "మహాదశ/అంతర్దశ వివరణలు పేరాగ్రాఫ్‌ల రూపంలో తెలుగులో ఇవ్వాలి.",
  },
  rahuKetu: {
    systemPrefix: "రాహు-కేతు విశ్లేషణలో English terms లేకుండా తెలుగులో రాయాలి.",
  },
  remedies: {
    systemPrefix: "పరిహారాలు మరియు ఆరోగ్య మార్గదర్శనం పూర్తిగా తెలుగులో ఉండాలి.",
  },
  numerology: {
    systemPrefix: "అంక శాస్త్ర భాగం శుద్ధ తెలుగులో ఇవ్వాలి.",
  },
  spiritual: {
    systemPrefix: "ఆధ్యాత్మిక భాగం సరళంగా, గంభీరంగా, పూర్తిగా తెలుగులో ఉండాలి.",
  },
  charaKarakas: {
    systemPrefix: "చర కారక భాగంలో పదాలు తెలుగులోనే ఉండాలి.",
  },
  glossary: {
    systemPrefix: "పదకోశం భాగంలో పదాలు మరియు నిర్వచనలు తెలుగులోనే ఇవ్వాలి.",
  },
  doshas: {
    systemPrefix: "దోష భాగంలో ప్రభావాలు, పరిహారాలు తెలుగులో మాత్రమే ఇవ్వాలి.",
  },
  rajYogs: {
    systemPrefix: "రాజయోగ భాగం పూర్తిగా తెలుగులో ఉండాలి.",
  },
  sadeSati: {
    systemPrefix: "ఏడున్నర శని భాగంలో దశలు మరియు కాలరేఖ తెలుగులో ఇవ్వాలి.",
  },
};
